import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_brand_delete_with_referenced_usage_blocked(
  connection: api.IConnection,
) {
  /**
   * E2E scenario: ensure that deleting a brand which is referenced by at least
   * one product is blocked by business/referential integrity rules.
   *
   * Steps:
   *
   * 1. Join as a platform admin to obtain an authorized session.
   * 2. Create a brand in the shopping mall catalog.
   * 3. Create a product that references the created brand via
   *    `shopping_mall_brand_id`.
   * 4. Attempt to delete the brand by calling the DELETE
   *    /shoppingMall/platformAdmin/brands/{brandId} endpoint.
   * 5. Verify that the deletion attempt fails by asserting that an error is
   *    thrown, indicating that the system blocks deletion of brands that are in
   *    active use.
   */

  // 1. Join as a platform admin; this also configures Authorization header.
  const adminJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert(admin);

  // 2. Create a brand that will later be referenced by a product.
  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri:
      "https://cdn.shoppingmall.test/brands/" +
      RandomGenerator.alphaNumeric(16) +
      ".png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Create a product that references the created brand.
  //
  // Note: We must provide a seller id but have no seller creation API in the
  // provided materials. We therefore rely on random UUID generation and the
  // backend's own contract as per the generated SDK; typia.assert ensures
  // response typing is correct when the operation succeeds.
  const productCreateBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: brand.id,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri:
      "https://cdn.shoppingmall.test/products/" +
      RandomGenerator.alphaNumeric(16) +
      ".jpg",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productCreateBody },
    );
  typia.assert(product);

  // 4 & 5. Attempt to delete the brand and expect an error because it is
  // referenced by at least one product.
  await TestValidator.error(
    "deleting a brand referenced by products must be blocked",
    async () => {
      await api.functional.shoppingMall.platformAdmin.brands.erase(connection, {
        brandId: brand.id,
      });
    },
  );
}
