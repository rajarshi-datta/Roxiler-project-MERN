import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Search } from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const COLORS = [
  '#FF5733', '#C70039', '#900C3F', '#581845', '#1C1C1C',
  '#FFC300', '#DAF7A6', '#28B463', '#154360', '#6C3483'
];

function App() {
  const [selectedMonth, setSelectedMonth] = useState('March');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: combinedData, isLoading } = useQuery(
    ['combinedData', selectedMonth, search, page],
    async () => {
      const response = await fetch(
        `http://localhost:5000/api/combined-data?month=${selectedMonth}&search=${search}&page=${page}`
      );
      return response.json();
    }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-4 border-b-4 border-white"></div>
      </div>
    );
  }

  const { transactions, statistics, barChart, pieChart } = combinedData || {};

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border rounded-lg bg-gray-700 text-white"
            >
              {MONTHS.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
            
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search transactions..."
                className="pl-10 pr-4 py-2 border rounded-lg w-64 bg-gray-700 text-white"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            {[{ label: 'Total Sale', value: `$${statistics?.totalSaleAmount?.toFixed(2)}`, color: 'blue' },
              { label: 'Sold Items', value: statistics?.soldItems, color: 'green' },
              { label: 'Not Sold Items', value: statistics?.notSoldItems, color: 'red' }
            ].map((stat, index) => (
              <div key={index} className={`bg-${stat.color}-500 p-6 rounded-lg shadow-md`}> 
                <h3 className="text-lg font-semibold">{stat.label}</h3>
                <p className="text-3xl font-bold">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Transactions Table */}
          <div className="overflow-x-auto rounded-lg shadow-sm mb-8">
            <table className="min-w-full bg-gray-700 shadow-md rounded-lg">
              <thead className="bg-blue-600 text-white">
                <tr>
                  {['ID', 'Title', 'Description', 'Price', 'Category', 'Sold'].map((header, i) => (
                    <th key={i} className="px-6 py-3 text-left text-sm font-semibold">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions?.transactions?.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-gray-600">
                    <td className="px-6 py-4">{transaction.id}</td>
                    <td className="px-6 py-4">{transaction.title}</td>
                    <td className="px-6 py-4">{transaction.description}</td>
                    <td className="px-6 py-4">${transaction.price}</td>
                    <td className="px-6 py-4">{transaction.category}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${transaction.sold ? 'bg-green-500 text-green-900' : 'bg-red-500 text-red-900'}`}> 
                        {transaction.sold ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-8">
            <div className="bg-gray-700 p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-semibold mb-4">Price Range Distribution</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barChart} barGap={5} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="gray" />
                  <XAxis dataKey="range" stroke="white" />
                  <YAxis stroke="white" />
                  <Tooltip wrapperStyle={{ backgroundColor: '#1C1C1C', color: 'white' }} />
                  <Legend />
                  <Bar dataKey="count" fill="#FF5733" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="bg-gray-700 p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-semibold mb-4">Categories Distribution</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieChart} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                    {pieChart?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="white" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip wrapperStyle={{ backgroundColor: '#1C1C1C', color: 'white' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
