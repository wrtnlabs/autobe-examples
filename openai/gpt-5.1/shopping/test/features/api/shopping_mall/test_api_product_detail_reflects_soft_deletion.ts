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

export async function test_api_product_detail_reflects_soft_deletion(
  connection: api.IConnection,
) {
  // 1. Platform admin join to obtain authenticated context
  const adminJoinBody = typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a brand as platform admin
  const brandCreateBody = typia.random<IShoppingMallBrand.ICreate>();
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Create a product associated with the brand
  const productCreateBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: brand.id,
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: undefined,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const createdProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productCreateBody },
    );
  typia.assert(createdProduct);

  // Validate created product basic invariants
  TestValidator.equals(
    "created product code should match request",
    createdProduct.code,
    productCreateBody.code,
  );

  // 4. Non-existent product detail should error (derive from real code to avoid collisions)
  const nonExistentCode: string = `${createdProduct.code}-nonexistent`;
  await TestValidator.error(
    "non-existent product detail should error",
    async () => {
      await api.functional.shoppingMall.products.at(connection, {
        productCode: nonExistentCode,
      });
    },
  );

  // 5. Public detail by business-visible code (endpoint is public; using same connection is fine)
  const publicProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.products.at(connection, {
      productCode: createdProduct.code,
    });
  typia.assert(publicProduct);

  // 6. Validate public detail reflects active (non-deleted) state
  TestValidator.equals(
    "public detail product code should match created product code",
    publicProduct.code,
    createdProduct.code,
  );
  TestValidator.equals(
    "public detail product id should match created product id",
    publicProduct.id,
    createdProduct.id,
  );
  TestValidator.predicate(
    "newly created product should not be soft-deleted (deleted_at null or undefined)",
    publicProduct.deleted_at === null || publicProduct.deleted_at === undefined,
  );

  // NOTE: True soft-delete behavior (setting deleted_at via a DELETE endpoint
  // and verifying 404/hidden behavior) and search endpoint reflections cannot
  // be tested here because the corresponding APIs are not provided in the
  // available SDK. This test focuses on verifying that non-deleted products
  // are accessible by {productCode} and correctly expose deleted_at as
  // null/undefined on the public detail endpoint.
}
