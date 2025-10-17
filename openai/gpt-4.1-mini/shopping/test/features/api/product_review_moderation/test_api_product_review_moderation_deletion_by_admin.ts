import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallReviewModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewModeration";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test the complete scenario for deleting a specific product review moderation
 * by an admin user.
 *
 * This test covers the entire lifecycle of review moderation deletion:
 *
 * - Admin creation and authentication
 * - Customer creation
 * - Product category creation
 * - Seller creation
 * - Customer places an order
 * - Customer submits a product review
 * - Admin creates a moderation for that review
 * - Admin deletes the moderation
 * - Assert that deleting the already deleted moderation throws an error
 *
 * Each step validates the response structure and business logic constraints.
 */
export async function test_api_product_review_moderation_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin account creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: RandomGenerator.alphaNumeric(32),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Customer account creation
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customers.create(connection, {
      body: {
        email: customerEmail,
        password_hash: RandomGenerator.alphaNumeric(32),
        status: "active",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 3. Category creation by admin
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      {
        body: {
          code: "CAT001",
          name: "Category",
          display_order: 1,
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Seller creation by admin
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: {
        email: sellerEmail,
        password_hash: RandomGenerator.alphaNumeric(32),
        status: "active",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 5. Customer order creation
  const orderNumber = RandomGenerator.alphaNumeric(10);
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_seller_id: seller.id,
        order_number: orderNumber,
        total_price: 100.0,
        status: "pending",
        business_status: "new",
        payment_method: "credit_card",
        shipping_address: "123 Test St, Test City",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 6. Product review creation by customer
  const productReview: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.productReviews.create(
      connection,
      {
        body: {
          shopping_mall_customer_id: customer.id,
          shopping_mall_product_id: typia.random<
            string & tags.Format<"uuid">
          >(), // product id placeholder
          shopping_mall_order_id: order.id,
          rating: 5,
          review_text: "Great product!",
          status: "pending",
        } satisfies IShoppingMallProductReview.ICreate,
      },
    );
  typia.assert(productReview);

  // 7. Review moderation creation by admin
  const reviewModeration: IShoppingMallReviewModeration =
    await api.functional.shoppingMall.admin.productReviews.reviewModerations.create(
      connection,
      {
        productReviewId: productReview.id,
        body: {
          shopping_mall_product_review_id: productReview.id,
          shopping_mall_admin_id: admin.id,
          action: "approve",
          comment: "Valid review",
          created_at: null,
          updated_at: null,
        } satisfies IShoppingMallReviewModeration.ICreate,
      },
    );
  typia.assert(reviewModeration);

  // 8. Review moderation deletion by admin
  await api.functional.shoppingMall.admin.productReviews.reviewModerations.eraseReviewModeration(
    connection,
    {
      productReviewId: productReview.id,
      id: reviewModeration.id,
    },
  );

  // At the end, confirm deletion by attempting to delete again and expect error
  await TestValidator.error(
    "deleting non-existing moderation should fail",
    async () => {
      await api.functional.shoppingMall.admin.productReviews.reviewModerations.eraseReviewModeration(
        connection,
        {
          productReviewId: productReview.id,
          id: reviewModeration.id,
        },
      );
    },
  );
}
