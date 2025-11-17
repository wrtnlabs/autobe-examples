# Success Metrics for ShoppingMall Platform

### Customer Acquisition Metrics

WHEN a new user visits the ShoppingMall platform, THE system SHALL track the source of acquisition to determine marketing effectiveness.

WHEN a user completes registration, THE system SHALL record the registration timestamp and acquisition channel.

THE ShoppingMall platform SHALL measure the following key customer acquisition metrics daily:

- Number of new customer registrations (target: 5,000 per day)
- Registration conversion rate from landing page visits (target: 8.5%)
- Cost per acquisition (CPA) per customer (target: under $3.50)
- Percentage of registered users who verify their email address within 24 hours (target: 90%)
- Number of new seller applications received daily (target: 200)

IF a user signs up but does not complete email verification within 48 hours, THEN THE system SHALL classify them as an abandoned registration and exclude them from active customer metrics.

WHERE a user is acquired through referral program, THE system SHALL track the referring user ID and attribute acquisition to that source.

WHILE a user is in the signup funnel, THE system SHALL log drop-off points at each step to optimize conversion.

### Customer Engagement Metrics

WHEN a customer logs into their account, THE system SHALL record login time and session duration.

THE ShoppingMall platform SHALL measure the following daily engagement metrics:

- Daily Active Customers (DAC): Customers who log in OR view products OR place orders (target: 75,000)
- Weekly Active Customers (WAC): Customers active in any 7-day period (target: 400,000)
- Average session duration for logged-in customers (target: 4.5 minutes)
- Average number of product views per session (target: 8)
- Percentage of customers who add at least one item to their wishlist in their first week (target: 65%)
- Percentage of customers who add at least one item to cart in their first week (target: 55%)

IF a customer has been inactive for 30 days (no login, no cart activity, no wishlist access), THEN THE system SHALL classify them as dormant and initiate a re-engagement email sequence.

WHILE a customer is browsing the product catalog, THE system SHALL measure the number of category clicks, search queries, and filter applications to assess discovery efficiency.

WHERE a customer uses the search function, THE system SHALL track the search query terms and the number of results clicked from the first page to identify popular search terms and opportunity areas.

### Seller Growth Metrics

WHEN a seller applies for an account, THE system SHALL record the application date and status (pending, approved, rejected).

THE ShoppingMall platform SHALL measure the following seller growth metrics weekly:

- Total number of active sellers (target: 15,000 within 6 months)
- Percentage of seller applications approved (target: 75%)
- Average time from application to product listing (target: 48 hours)
- Number of new product listings per seller per week (target: 12)
- Number of sellers who list at least 10 products within 14 days of approval (target: 60%)

IF a seller has not listed any products within 7 days of account approval, THEN THE system SHALL trigger a seller onboarding assistant notification.

WHILE a seller is managing their storefront, THE system SHALL track number of product edits, inventory updates, and response actions to customer reviews.

WHERE a seller has an approved seller account but zero sales in 30 days, THE system SHALL flag them as "at risk" for intervention by seller success team.

### Revenue and Transaction Metrics

WHEN an order is placed successfully, THE system SHALL record the transaction value, number of items, and applied promotions.

THE ShoppingMall platform SHALL measure the following revenue and transaction metrics daily:

- Gross Merchandise Value (GMV): Total value of all completed orders (target: $2.5 million/day)
- Average Order Value (AOV): Total GMV divided by number of orders (target: $89.50)
- Daily number of completed orders (target: 28,000)
- Order completion rate: Completed orders divided by cart checkouts initiated (target: 68%)
- Percentage of orders using at least one promotion or discount code (target: 45%)
- Percentage of orders using saved payment methods (target: 75%)

IF an order is cancelled after payment processing, THEN THE system SHALL record cancellation reason (e.g., out-of-stock, abuse, user request) and track its impact on GMV.

WHILE an order is in checkout, THE system SHALL measure cart abandonment rate by step (address entry, shipping method, payment, review).

WHERE a customer makes a repeat purchase within 90 days of their first purchase, THE system SHALL count it as a returning customer transaction.

### Operational Efficiency Metrics

WHEN an order is fulfilled, THE system SHALL record the time from payment confirmation to shipment status update.

THE ShoppingMall platform SHALL measure the following operational efficiency metrics daily:

- Average order fulfillment time (from payment to shipping label generated) (target: 6 hours)
- Percentage of orders shipped within 24 hours of payment (target: 85%)
- Percentage of orders delivered within promised transit window (target: 94%)
- Number of inventory updates performed by sellers per day (target: 120,000)
- Number of customer service tickets opened per 1,000 orders (target: 12)
- Average time to resolve a customer service ticket (target: 10 hours)

WHILE an order is in processing, THE system SHALL measure time spent in each fulfillment stage (picking, packing, quality check, dispatch).

IF a product is marked as out-of-stock on the storefront but has pending inventory records, THEN THE system SHALL trigger an alert for inventory sync verification.

### User Retention and Loyalty Metrics

WHEN a customer makes a purchase, THE system SHALL record the date and calculate days since first purchase.

THE ShoppingMall platform SHALL measure the following retention and loyalty metrics monthly:

- Customer Retention Rate: Percentage of customers who made a purchase in the previous month and also made a purchase in the current month (target: 45%)
- Customer Lifetime Value (CLV): Sum of all purchases made by a customer over 12 months (target: $675)
- Repeat Purchase Rate: Percentage of customers who make 2 or more purchases within 6 months (target: 55%)
- Average days between first and second purchase (target: 34 days)
- Percentage of customers who have left a product review after purchasing (target: 38%)
- Number of customers who refer at least one other user (target: 8% of total customers)

IF a customer makes more than 3 purchases in one month, THEN THE system SHALL classify them as a high-value customer and assign a loyalty tier (e.g., Gold).

WHILE a customer interacts with the rewards program, THE system SHALL track points earned, redeemed, and expired to assess program effectiveness.

WHERE a customer has not purchased for 90 days but is still logged in, THE system SHALL trigger a personalized re-engagement offer based on their past purchase history.

WHERE a seller has 50 or more five-star reviews, THE system SHALL flag them as a "Top Seller" and give them status on their storefront.

THE ShoppingMall platform SHALL calculate Net Promoter Score (NPS) monthly by surveying 1% of active users with the question: "How likely are you to recommend ShoppingMall to a friend?" (scale 0-10). Target NPS: 58.

THE ShoppingMall platform SHALL measure Customer Satisfaction Score (CSAT) after every completed order with message: "How satisfied are you with your order experience?" (scale 1-5). Target CSAT: 4.5.

IF a customer unsubscribes from marketing emails, THEN THE system SHALL update their preference status but continue to deliver transactional communications (order confirmations, shipping notices).

WHERE a customer has exhibited high engagement (orders above AOV, frequent logins) but has not purchased in 60 days, THE system SHALL trigger a personalized retention campaign initiated by the marketing automation system.