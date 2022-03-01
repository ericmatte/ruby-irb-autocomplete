require 'IRB'

puts "#{ENV['cursor']}#{IRB::InputCompletor.retrieve_completion_data(ENV['input'], bind: binding).to_json}"
