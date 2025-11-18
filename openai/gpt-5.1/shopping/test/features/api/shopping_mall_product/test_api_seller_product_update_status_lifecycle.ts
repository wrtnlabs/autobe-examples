import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate seller-managed product lifecycle via status field using seller
 * endpoints.
 *
 * Business goal: Ensure that an authenticated seller can create a product with
 * an initial lifecycle status, then transition that status through the update
 * endpoint without unintentionally modifying other product fields. The test
 * also relies on join-based authentication to exercise role-based access for
 * seller paths.
 *
 * Steps:
 *
 * 1. Register a seller using POST /auth/seller/join, which also sets the
 *    Authorization header on the shared connection.
 * 2. As the authenticated seller, create a product using POST
 *    /shoppingMall/seller/products with an initial status value such as "draft"
 *    and realistic catalog fields.
 * 3. Call PUT /shoppingMall/seller/products/{productId} with an
 *    IShoppingMallProduct.IUpdate body that only sets the status to a new
 *    lifecycle value like "active".
 * 4. Verify that the returned IShoppingMallProduct has:
 *
 *    - Status equal to the new value
 *    - All other business fields (code, title, summary, description, brand,
 *         model_name, primary_image_uri, default_locale, seller linkage) equal
 *         to the original product from the create call, aside from updated_at
 *         which is expected to change.
 * 5. Perform a second status transition (for example from "active" to "inactive")
 *    again using the update endpoint, and re-validate that only status changes
 *    and other fields remain stable.
 *
 * DTO usage:
 *
 * - IShoppingMallSellerAuthJoin.IRequest for the join request body.
 * - IShoppingMallSeller.IAuthorized as the seller join response type.
 * - IShoppingMallProduct.ICreate as the create body type.
 * - IShoppingMallProduct as the product response type (create and update).
 * - IShoppingMallProduct.IUpdate for the update body type, using partial updates
 *   that only include status.
 *
 * Validation strategy:
 *
 * - Use typia.assert on all non-void API responses to ensure structural type
 *   correctness.
 * - Use TestValidator.equals to compare the original and updated product objects,
 *   checking that status transitions occur as expected and that all non-status
 *   fields remain unchanged across updates (ignoring timestamp fields when
 *   comparing).
 */
export async function test_api_seller_product_update_status_lifecycle(
  connection: api.IConnection,
) {
  // 1. Seller joins the platform; this call also injects the access token
  //    into connection.headers.Authorization for subsequent seller endpoints.
  const joinBody = typia.random<IShoppingMallSellerAuthJoin.IRequest>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 2. Seller creates a new product with initial status "draft".
  const createBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 1 }),
    model_name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "draft",
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const created: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallProduct>(created);

  // 3. First lifecycle transition: draft -> active via status-only update.
  const firstUpdateBody = {
    status: "active",
  } satisfies IShoppingMallProduct.IUpdate;

  const updatedOnce: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.update(connection, {
      productId: created.id,
      body: firstUpdateBody,
    });
  typia.assert<IShoppingMallProduct>(updatedOnce);

  // Validate that status changed and other core fields stayed the same.
  TestValidator.equals(
    "status updated draft -> active",
    updatedOnce.status,
    "active",
  );
  TestValidator.equals(
    "code unchanged after first status update",
    updatedOnce.code,
    created.code,
  );
  TestValidator.equals(
    "title unchanged after first status update",
    updatedOnce.title,
    created.title,
  );
  TestValidator.equals(
    "summary unchanged after first status update",
    updatedOnce.summary,
    created.summary,
  );
  TestValidator.equals(
    "description unchanged after first status update",
    updatedOnce.description,
    created.description,
  );
  TestValidator.equals(
    "brand unchanged after first status update",
    updatedOnce.brand ?? null,
    created.brand ?? null,
  );
  TestValidator.equals(
    "model_name unchanged after first status update",
    updatedOnce.model_name ?? null,
    created.model_name ?? null,
  );
  TestValidator.equals(
    "primary_image_uri unchanged after first status update",
    updatedOnce.primary_image_uri ?? null,
    created.primary_image_uri ?? null,
  );
  TestValidator.equals(
    "default_locale unchanged after first status update",
    updatedOnce.default_locale,
    created.default_locale,
  );
  TestValidator.equals(
    "seller linkage unchanged after first status update",
    updatedOnce.shopping_mall_seller_id,
    created.shopping_mall_seller_id,
  );

  // 4. Second lifecycle transition: active -> inactive via status-only update.
  const secondUpdateBody = {
    status: "inactive",
  } satisfies IShoppingMallProduct.IUpdate;

  const updatedTwice: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.update(connection, {
      productId: created.id,
      body: secondUpdateBody,
    });
  typia.assert<IShoppingMallProduct>(updatedTwice);

  // Validate that status changed again and other fields remain stable versus first update.
  TestValidator.equals(
    "status updated active -> inactive",
    updatedTwice.status,
    "inactive",
  );
  TestValidator.equals(
    "code unchanged after second status update",
    updatedTwice.code,
    updatedOnce.code,
  );
  TestValidator.equals(
    "title unchanged after second status update",
    updatedTwice.title,
    updatedOnce.title,
  );
  TestValidator.equals(
    "summary unchanged after second status update",
    updatedTwice.summary,
    updatedOnce.summary,
  );
  TestValidator.equals(
    "description unchanged after second status update",
    updatedTwice.description,
    updatedOnce.description,
  );
  TestValidator.equals(
    "brand unchanged after second status update",
    updatedTwice.brand ?? null,
    updatedOnce.brand ?? null,
  );
  TestValidator.equals(
    "model_name unchanged after second status update",
    updatedTwice.model_name ?? null,
    updatedOnce.model_name ?? null,
  );
  TestValidator.equals(
    "primary_image_uri unchanged after second status update",
    updatedTwice.primary_image_uri ?? null,
    updatedOnce.primary_image_uri ?? null,
  );
  TestValidator.equals(
    "default_locale unchanged after second status update",
    updatedTwice.default_locale,
    updatedOnce.default_locale,
  );
  TestValidator.equals(
    "seller linkage unchanged after second status update",
    updatedTwice.shopping_mall_seller_id,
    updatedOnce.shopping_mall_seller_id,
  );
}
