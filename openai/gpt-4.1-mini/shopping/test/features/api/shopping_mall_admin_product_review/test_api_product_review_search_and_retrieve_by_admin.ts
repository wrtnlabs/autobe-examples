import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductReview";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate the product review search and retrieval functionality for admins.
 *
 * This test function executes an end-to-end scenario covering all prerequisite
 * data creation steps and authentication roles to verify the admin's ability to
 * search and retrieve product reviews with various filter criteria and
 * pagination.
 *
 * Steps:
 *
 * 1. Authenticate as a customer and create a new customer account.
 * 2. Authenticate as an admin and create a product category for the catalog.
 * 3. Authenticate as a seller and create a seller account.
 * 4. Authenticate as an admin and create a product under the seller and category.
 * 5. Authenticate as the customer and place a new order to confirm purchase.
 * 6. As the customer, submit multiple product reviews linked to the order and
 *    product.
 * 7. Authenticate as the admin.
 * 8. Perform product review search operations for the admin, testing pagination,
 *    filter by rating and status, and product ID.
 * 9. Validate that the search result pagination and data match expectations.
 * 10. Test search with invalid filter values to verify error handling.
 *
 * This test ensures the complete workflow for admin management of product
 * reviews functions correctly and securely.
 */
export async function test_api_product_review_search_and_retrieve_by_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate as customer and create a customer user
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(8);
  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
  } satisfies IShoppingMallCustomer.IJoin;
  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  // 2. Authenticate as admin and create product category
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(8);
  const adminJoinBody = {
    email: adminEmail,
    password_hash: adminPassword,
    full_name: null,
    phone_number: null,
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;

  // Join admin for authentication
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuth);

  // 3. Create a product category
  const categoryCreateBody = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    parent_id: null,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      { body: categoryCreateBody },
    );
  typia.assert(category);

  // 4. Authenticate as seller and create a seller user
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(8);
  const sellerCreateBody = {
    email: sellerEmail,
    password_hash: sellerPassword,
    company_name: RandomGenerator.name(),
    contact_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallSeller.ICreate;
  const sellerAuth: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: sellerCreateBody,
    });
  typia.assert(sellerAuth);

  // 5. Create a product under the seller and category
  const productCreateBody = {
    shopping_mall_category_id: category.id,
    shopping_mall_seller_id: sellerAuth.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 6. Authenticate as customer and create an order confirming purchase
  const orderNumber = `ORD-${RandomGenerator.alphaNumeric(8)}`;
  const orderCreateBody = {
    shopping_mall_customer_id: customerAuth.id,
    shopping_mall_seller_id: sellerAuth.id,
    order_number: orderNumber,
    total_price: 100,
    status: "paid",
    business_status: "received",
    payment_method: "credit_card",
    shipping_address: "123 Testing St",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 7. Submit multiple product reviews by the customer
  const reviewPromises = ArrayUtil.asyncRepeat(3, async () => {
    const reviewCreateBody = {
      shopping_mall_customer_id: customerAuth.id,
      shopping_mall_product_id: product.id,
      shopping_mall_order_id: order.id,
      rating: RandomGenerator.pick([1, 2, 3, 4, 5] as const),
      review_text: RandomGenerator.content({ paragraphs: 1 }),
      status: "pending",
    } satisfies IShoppingMallProductReview.ICreate;
    const review =
      await api.functional.shoppingMall.customer.productReviews.create(
        connection,
        { body: reviewCreateBody },
      );
    typia.assert(review);
    return review;
  });
  const reviews = await reviewPromises;

  // 8. Authenticate as admin again to perform product review search
  await api.functional.auth.admin.join(connection, { body: adminJoinBody });

  // 9. Perform paginated search for product reviews with filters
  const searchRequest = {
    page: 1,
    limit: 2,
    filterRating: 5,
    filterStatus: "pending",
    filterProductId: product.id,
  } satisfies IShoppingMallProductReview.IRequest;
  const searchResult =
    await api.functional.shoppingMall.admin.productReviews.index(connection, {
      body: searchRequest,
    });
  typia.assert(searchResult);

  // Validate searchResult
  TestValidator.predicate(
    "page size <= limit",
    searchResult.pagination.limit >= searchResult.data.length,
  );
  TestValidator.equals(
    "page number correctness",
    searchResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "all ratings are 5",
    searchResult.data.every((review) => review.rating === 5),
  );
  TestValidator.predicate(
    "all statuses are pending",
    searchResult.data.every((review) => review.status === "pending"),
  );
  TestValidator.predicate(
    "all product IDs match",
    searchResult.data.every(
      (review) => review.shopping_mall_product_id === product.id,
    ),
  );

  // 10. Test searching with invalid filter: rating out of range
  await TestValidator.error("invalid rating filter throws error", async () => {
    const invalidSearchRequest = {
      ...searchRequest,
      filterRating: 6,
    } satisfies IShoppingMallProductReview.IRequest;
    await api.functional.shoppingMall.admin.productReviews.index(connection, {
      body: invalidSearchRequest,
    });
  });
}
