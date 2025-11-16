import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate platform-admin product creation without brand association.
 *
 * Business context:
 *
 * - A platform admin should be able to bootstrap catalog configuration by
 *   creating category trees and products even when a product is not yet
 *   associated with any brand.
 * - The product creation contract (IShoppingMallProduct.ICreate) makes brand
 *   optional via `shopping_mall_brand_id?: uuid | null | undefined`, and the
 *   read model (IShoppingMallProduct) exposes `brand?:
 *   IShoppingMallBrand.ISummary | null | undefined`.
 *
 * This test ensures that:
 *
 * 1. A platform admin can join/authenticate via /auth/platformAdmin/join.
 * 2. The admin can create at least one category tree via
 *    /shoppingMall/platformAdmin/categoryTrees.
 * 3. The admin can create a product via /shoppingMall/platformAdmin/products while
 *    omitting `shopping_mall_brand_id` entirely.
 * 4. The resulting IShoppingMallProduct has brand set to null/undefined while
 *    echoing back core fields like code, name, status, and is_multi_sku and
 *    correctly wiring seller.id to shopping_mall_seller_id.
 */
export async function test_api_platform_admin_product_creation_without_brand(
  connection: api.IConnection,
) {
  // 1. Platform admin join & authentication
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a category tree as catalog prerequisite
  const categoryTreeBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeBody,
      },
    );
  typia.assert<IShoppingMallCategoryTree>(categoryTree);

  // 3. Create a product without brand association
  const sellerId = typia.random<string & tags.Format<"uuid">>();

  const productCode = RandomGenerator.alphaNumeric(16);
  const productName = RandomGenerator.paragraph({ sentences: 2 });
  const productStatus = "active";
  const isMultiSku = false;

  const productCreateBody = {
    shopping_mall_seller_id: sellerId,
    // Intentionally omit shopping_mall_brand_id to represent no brand
    code: productCode,
    name: productName,
    short_description: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: productStatus,
    is_multi_sku: isMultiSku,
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    additional_data: "{}",
  } satisfies IShoppingMallProduct.ICreate;

  const createdProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productCreateBody,
      },
    );
  typia.assert<IShoppingMallProduct>(createdProduct);

  // 4. Contract validations
  TestValidator.equals(
    "product code should match request",
    createdProduct.code,
    productCode,
  );
  TestValidator.equals(
    "product name should match request",
    createdProduct.name,
    productName,
  );
  TestValidator.equals(
    "product status should match request",
    createdProduct.status,
    productStatus,
  );
  TestValidator.equals(
    "is_multi_sku should match request",
    createdProduct.is_multi_sku,
    isMultiSku,
  );
  TestValidator.equals(
    "seller.id should equal shopping_mall_seller_id in request",
    createdProduct.seller.id,
    sellerId,
  );

  await TestValidator.predicate(
    "brand must be null or undefined when shopping_mall_brand_id is omitted",
    async () =>
      createdProduct.brand === null || createdProduct.brand === undefined,
  );
}
