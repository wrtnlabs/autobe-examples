import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Verify that a seller, even when owning a product, cannot delete it via the
 * admin-only DELETE /shoppingMall/admin/products/{productId} endpoint.
 *
 * Business context:
 *
 * - Admins manage products through admin endpoints.
 * - Sellers manage their products through seller endpoints only.
 * - Role-based access control must prevent a seller token from invoking
 *   admin-only deletion operations.
 *
 * Test steps:
 *
 * 1. Register an admin account using POST /auth/admin/join to ensure there is at
 *    least one admin actor in the system (for scenario completeness).
 * 2. Register a seller account using POST /auth/seller/join; this switches the
 *    shared connection into a seller-authenticated context.
 * 3. As the authenticated seller, create a product via POST
 *    /shoppingMall/seller/products and capture its productId. Also assert that
 *    the product’s shopping_mall_seller_id matches the seller’s id to prove
 *    ownership.
 * 4. While still authenticated as the seller, attempt to call DELETE
 *    /shoppingMall/admin/products/{productId} via
 *    api.functional.shoppingMall.admin.products.erase and assert that this call
 *    fails by using TestValidator.error. We do not check a specific HTTP status
 *    code; we only assert that an error is thrown, which is sufficient to
 *    confirm that the seller cannot use the admin delete endpoint.
 * 5. We intentionally do not re-fetch the product after the failure, because a GET
 *    /shoppingMall/products/{productId} endpoint is not provided in the
 *    available SDK. Instead, we rely on the failure of the delete call as
 *    evidence that the operation did not succeed under a seller token.
 */
export async function test_api_product_delete_forbidden_for_seller_actor(
  connection: api.IConnection,
) {
  // 1. Register an admin account (scenario completeness; not used further).
  const adminJoinInput = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Register a seller account; this sets the connection Authorization to a
  //    seller access token.
  const sellerJoinInput = typia.random<IShoppingMallSellerAuthJoin.IRequest>();
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinInput,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 3. Create a product owned by this seller via the seller products endpoint.
  const productCreateBody = {
    code: RandomGenerator.alphabets(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    status: "active",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // Validate that the product is owned by the authenticated seller.
  TestValidator.equals(
    "created product must be owned by the authenticated seller",
    product.shopping_mall_seller_id,
    sellerAuthorized.id,
  );

  const productId = product.id;

  // 4. Attempt to delete the product via the admin endpoint using the seller
  //    token. This must fail with some error.
  await TestValidator.error(
    "seller cannot erase product via admin deletion endpoint",
    async () => {
      await api.functional.shoppingMall.admin.products.erase(connection, {
        productId,
      });
    },
  );
}
