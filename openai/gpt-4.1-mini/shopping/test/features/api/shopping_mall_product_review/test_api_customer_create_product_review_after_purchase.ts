import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";

/**
 * Test creating a product review by a customer after purchase.
 *
 * Business Context: Reviews can only be created by customers who have purchased
 * the product. This test validates the full flow from user creation, product
 * creation by admin, customer ordering the product, and then customer attaching
 * a review to the order.
 *
 * Steps to perform:
 *
 * 1. Create an admin user and login.
 * 2. Create a product as the admin.
 * 3. Create a customer user and login.
 * 4. Create a purchase order by the customer for the product.
 * 5. Submit a product review referencing the customer, product, and order.
 * 6. Verify the created review is correct and properly linked.
 * 7. Create another customer who did NOT purchase, login, and verify that attempt
 *    to submit review results in failure.
 */
export async function test_api_customer_create_product_review_after_purchase(
  connection: api.IConnection,
) {
  // 1. Admin user sign up and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";
  const adminCreateBody = {
    email: adminEmail,
    password_hash: adminPassword,
    status: "active" as const,
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminCreateBody,
  });
  typia.assert(admin);

  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      type: "admin",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 2. Create product as admin
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  const productCreateBody = {
    shopping_mall_category_id: categoryId,
    shopping_mall_seller_id: admin.id,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(3),
    description: "A test product description",
    status: "active",
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: productCreateBody,
    },
  );
  typia.assert(product);

  // 3. Create and login the purchasing customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "CustPass123!";
  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
  } satisfies IShoppingMallCustomer.IJoin;

  const customer = await api.functional.auth.customer.join(connection, {
    body: customerJoinBody,
  });
  typia.assert(customer);

  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      __typename: "ILogin",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 4. Customer places an order for the product
  const orderCreateBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_seller_id: admin.id,
    order_number: RandomGenerator.alphaNumeric(12),
    total_price: 10000,
    status: "Paid",
    business_status: "Processed",
    payment_method: "credit_card",
    shipping_address: "1234 Test St, Seoul, South Korea",
  } satisfies IShoppingMallOrder.ICreate;

  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: orderCreateBody,
    },
  );
  typia.assert(order);

  // 5. Submit a valid product review by the purchasing customer
  const reviewCreateBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_product_id: product.id,
    shopping_mall_order_id: order.id,
    rating: 5,
    review_text: "Excellent product! Highly recommended.",
    status: "pending",
  } satisfies IShoppingMallProductReview.ICreate;

  const review =
    await api.functional.shoppingMall.customer.productReviews.create(
      connection,
      {
        body: reviewCreateBody,
      },
    );
  typia.assert(review);
  TestValidator.equals(
    "review customer ID matches",
    review.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "review product ID matches",
    review.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "review order ID matches",
    review.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals("review rating is correct", review.rating, 5);
  TestValidator.equals("review status is pending", review.status, "pending");

  // 6. Create a second customer who did NOT purchase the product
  const unpurchasedEmail = typia.random<string & tags.Format<"email">>();
  const unpurchasedPassword = "NoPurchase123!";
  const unpurchasedJoinBody = {
    email: unpurchasedEmail,
    password: unpurchasedPassword,
  } satisfies IShoppingMallCustomer.IJoin;

  const unpurchasedCustomer = await api.functional.auth.customer.join(
    connection,
    {
      body: unpurchasedJoinBody,
    },
  );
  typia.assert(unpurchasedCustomer);

  await api.functional.auth.customer.login(connection, {
    body: {
      email: unpurchasedEmail,
      password: unpurchasedPassword,
      __typename: "ILogin",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 7. Attempt to post a review as unpurchased customer - expect failure
  const badReviewBody = {
    shopping_mall_customer_id: unpurchasedCustomer.id,
    shopping_mall_product_id: product.id,
    shopping_mall_order_id: order.id,
    rating: 3,
    review_text: "I have not purchased but want to review",
    status: "pending",
  } satisfies IShoppingMallProductReview.ICreate;

  await TestValidator.error(
    "unpaid customer cannot create review",
    async () => {
      await api.functional.shoppingMall.customer.productReviews.create(
        connection,
        {
          body: badReviewBody,
        },
      );
    },
  );
}
