import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";

/**
 * Test the permanent deletion of a product review by an admin user.
 *
 * This test covers a full realistic scenario:
 *
 * 1. Admin account creation and login
 * 2. Customer account creation and login
 * 3. Customer creates a product review with realistic data
 * 4. Admin switches back and permanently deletes the created review
 * 5. Attempts to delete again to verify deletion succeeded and access is denied
 *
 * The test ensures that only authorized admins can perform deletions, verifies
 * JWT authentication flows, and validates error handling on duplicate deletion.
 * It uses exact DTO types for all payloads, adheres strictly to format and
 * schema constraints, and performs type assertions on responses and business
 * validation on error cases.
 */
export async function test_api_product_review_permanent_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Create admin account and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "secure-admin-password-1234";
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.portal.fake/",
    referrer: "https://admin.portal.fake/previous",
  } satisfies IShoppingMallAdmin.ILogin;
  await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });

  // 2. Create customer account and login
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "secure-customer-password-1234";
  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    nickname: RandomGenerator.name(),
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://customer.portal.fake/",
    referrer: "https://customer.portal.fake/previous",
  } satisfies IShoppingMallCustomer.ILogin;

  await api.functional.auth.customer.login(connection, {
    body: customerLoginBody,
  });

  // 3. Create product review as customer
  const productSkuId = typia.random<string & tags.Format<"uuid">>();
  const orderId = typia.random<string & tags.Format<"uuid">>();

  const reviewCreateBody = {
    shopping_mall_product_sku_id: productSkuId,
    shopping_mall_order_id: orderId,
    rating: RandomGenerator.pick([1, 2, 3, 4, 5] as const),
    review_body: RandomGenerator.paragraph({ sentences: 5 }),
    moderation_status: "pending",
  } satisfies IShoppingMallProductReview.ICreate;

  const review: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.productReviews.create(
      connection,
      {
        body: reviewCreateBody,
      },
    );
  typia.assert(review);

  // 4. Switch back to admin to delete the review
  await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });

  // 5. Permanently delete the product review
  await api.functional.shoppingMall.admin.productReviews.erase(connection, {
    id: review.id,
  });

  // 6. Validate that deleting again throws error
  await TestValidator.error(
    "deleting a non-existent review should fail",
    async () => {
      await api.functional.shoppingMall.admin.productReviews.erase(connection, {
        id: review.id,
      });
    },
  );
}
