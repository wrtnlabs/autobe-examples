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
 * Validate cross-actor lifecycle where a seller creates and updates a product,
 * then an admin further updates and finally deletes the same product.
 *
 * Business flow:
 *
 * 1. A seller joins the platform and becomes authenticated.
 * 2. The seller creates a product using the seller create endpoint.
 * 3. The seller updates that product to change some catalog-facing fields.
 * 4. An admin joins the platform and becomes authenticated.
 * 5. The admin updates the same product using the admin update endpoint.
 * 6. The admin deletes the product using the admin delete endpoint.
 *
 * Validations focus on:
 *
 * - Ensuring all intermediate create/update operations succeed and return a
 *   well-typed IShoppingMallProduct.
 * - Verifying that seller and admin updates actually mutate expected fields
 *   (title, status, brand, etc.) in the returned product representations.
 * - Confirming that the final delete operation completes without error, using the
 *   same productId that has been modified by both actors.
 */
export async function test_api_product_delete_after_seller_and_admin_updates(
  connection: api.IConnection,
) {
  // 1. Seller joins (register + implicitly authenticated)
  const sellerJoinBody = typia.random<IShoppingMallSellerAuthJoin.IRequest>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 2. Seller creates a product
  const createBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 1 }),
    model_name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "draft",
    primary_image_uri: `https://cdn.example.com/${RandomGenerator.alphaNumeric(16)}.jpg`,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const created: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallProduct>(created);

  TestValidator.equals(
    "created product should reflect create body fields before updates",
    created.code,
    createBody.code,
  );
  TestValidator.equals(
    "created product title matches create body",
    created.title,
    createBody.title,
  );

  // 3. Seller updates the product
  const sellerUpdateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "active",
  } satisfies IShoppingMallProduct.IUpdate;

  const sellerUpdated: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.update(connection, {
      productId: created.id,
      body: sellerUpdateBody,
    });
  typia.assert<IShoppingMallProduct>(sellerUpdated);

  TestValidator.equals(
    "seller update should change title",
    sellerUpdated.title,
    sellerUpdateBody.title,
  );
  TestValidator.equals(
    "seller update should change status to active",
    sellerUpdated.status,
    sellerUpdateBody.status,
  );

  // 4. Admin joins (register + implicitly authenticated)
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 5. Admin updates the same product
  const adminUpdateBody = {
    brand: RandomGenerator.paragraph({ sentences: 1 }),
    model_name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "admin_unpublished",
  } satisfies IShoppingMallProduct.IUpdate;

  const adminUpdated: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.update(connection, {
      productId: created.id,
      body: adminUpdateBody,
    });
  typia.assert<IShoppingMallProduct>(adminUpdated);

  TestValidator.equals(
    "admin update should change brand",
    adminUpdated.brand,
    adminUpdateBody.brand,
  );
  TestValidator.equals(
    "admin update should change status to admin_unpublished",
    adminUpdated.status,
    adminUpdateBody.status,
  );

  // 6. Admin deletes the product
  const eraseResult = await api.functional.shoppingMall.admin.products.erase(
    connection,
    {
      productId: created.id,
    },
  );

  // eraseResult is void; just ensure that awaiting did not throw.
  TestValidator.equals(
    "erase should return undefined (void) without throwing",
    eraseResult,
    undefined,
  );
}
