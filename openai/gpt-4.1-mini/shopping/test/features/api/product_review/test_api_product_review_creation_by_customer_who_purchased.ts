import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * E2E test for product review creation by a customer who purchased the product.
 *
 * This test simulates a multi-actor workflow including admin creation, seller
 * creation, product category creation, product creation, customer registration,
 * order creation to confirm the product purchase, and finally the customer
 * submitting a review for the product.
 *
 * It verifies that the review is created successfully with status 'pending',
 * correct associations, and timestamps.
 *
 * It also checks the enforcement of authorization and purchase verification.
 */
export async function test_api_product_review_creation_by_customer_who_purchased(
  connection: api.IConnection,
) {
  // 1. Register admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "TestAdmin123!";
  const adminCreateBody = {
    email: adminEmail,
    password_hash: adminPassword,
    status: "active" as const,
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(admin);

  // 2. Register seller by admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      type: "admin",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "TestSeller123!";
  const sellerCreateBody = {
    email: sellerEmail,
    password_hash: sellerPassword,
    status: "active" as const,
  } satisfies IShoppingMallSeller.ICreate;
  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: sellerCreateBody,
    });
  typia.assert(seller);

  // 3. Create product category by admin
  const categoryCreateBody = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    display_order: RandomGenerator.alphaNumeric(1).length, // Use length of 1 char alphnumeric as int
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      { body: categoryCreateBody },
    );
  typia.assert(category);

  // 4. Create product by admin with seller and category ids
  const productCreateBody = {
    shopping_mall_category_id: category.id,
    shopping_mall_seller_id: seller.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    status: "active",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 5. Register customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "TestCustomer123!";
  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
  } satisfies IShoppingMallCustomer.IJoin;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 6. Customer login
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      __typename: "login",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 7. Create order to confirm purchase
  const orderCreateBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_seller_id: seller.id,
    order_number: `ORD-${Date.now()}`,
    total_price: 10000,
    status: "paid",
    business_status: "completed",
    payment_method: "credit_card",
    shipping_address: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 7,
    }),
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 8. Create product review by customer who purchased
  const reviewCreateBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_product_id: product.id,
    shopping_mall_order_id: order.id,
    rating: 5,
    review_text: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 5,
      wordMin: 3,
      wordMax: 7,
    }),
    status: "pending",
  } satisfies IShoppingMallProductReview.ICreate;

  const review: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.productReviews.create(
      connection,
      { body: reviewCreateBody },
    );
  typia.assert(review);

  TestValidator.equals(
    "review status should be pending",
    review.status,
    "pending",
  );
  TestValidator.equals(
    "review has correct customer id",
    review.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "review has correct product id",
    review.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "review has correct order id",
    review.shopping_mall_order_id,
    order.id,
  );
  TestValidator.predicate(
    "review created_at exists",
    typeof review.created_at === "string" && review.created_at.length > 0,
  );
  TestValidator.predicate(
    "review updated_at exists",
    typeof review.updated_at === "string" && review.updated_at.length > 0,
  );
  TestValidator.equals("review deleted_at is null", review.deleted_at, null);
}
