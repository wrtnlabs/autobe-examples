import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that a platform admin cannot create two SKUs with the same code
 * under the same product.
 *
 * Business purpose:
 *
 * - Ensure the composite uniqueness constraint on (shopping_mall_product_id,
 *   code) is honored for platform-admin SKU creation.
 * - Verify that administrative privileges do not bypass SKU code uniqueness
 *   within a product, preserving catalog data integrity.
 *
 * Scenario steps:
 *
 * 1. Register a new platform admin (POST /auth/platformAdmin/join) to obtain an
 *    authenticated platform admin context. The SDK automatically wires
 *    Authorization headers from the returned
 *    IShoppingMallPlatformAdmin.IAuthorized token, so subsequent calls use this
 *    context.
 * 2. Create a brand (POST /shoppingMall/platformAdmin/brands) using
 *    IShoppingMallBrand.ICreate with a random name and slug, plus optional
 *    description/logo_uri.
 * 3. Create a product (POST /shoppingMall/platformAdmin/products) using
 *    IShoppingMallProduct.ICreate with:
 *
 *    - Shopping_mall_seller_id: a random UUID string.
 *    - Shopping_mall_brand_id: set to the created brand.id.
 *    - Code: a random non-empty string for productCode.
 *    - Name/status/is_multi_sku and other fields filled with plausible values (e.g.,
 *         status = "active", is_multi_sku = true).
 * 4. Define a concrete skuCode string (e.g., RandomGenerator.alphaNumeric(12)) and
 *    a valid IShoppingMallProductSku.ICreate body containing:
 *
 *    - Code: skuCode
 *    - Name: random paragraph/name
 *    - ListPrice/salePrice: positive numbers with salePrice <= listPrice
 *    - Currency: a realistic ISO 4217 code like "KRW" or "USD"
 *    - IsActive: true
 *    - IsPurchasable: true
 * 5. Call api.functional.shoppingMall.platformAdmin.products.skus.create with
 *    productCode = product.code and body = skuCreate1 (ICreate). Assert success
 *    and validate response with typia.assert<IShoppingMallProductSku>.
 *    Additionally, use TestValidator.equals to check that:
 *
 *    - CreatedSku.productCode equals product.code
 *    - CreatedSku.code equals skuCode
 * 6. Attempt to create a second SKU for the same product with the same skuCode
 *    (and otherwise valid data). Wrap this in an async closure and use await
 *    TestValidator.error("duplicate SKU code should fail", async () => { ... })
 *    to assert that an error is thrown. We do not test the exact error type or
 *    HTTP status; we only ensure the operation does not succeed.
 * 7. The test ends after confirming that the duplication attempt fails, thereby
 *    validating that the unique constraint is enforced for platform-admin SKU
 *    creation.
 */
export async function test_api_platform_admin_create_sku_with_duplicate_code_for_same_product_rejected(
  connection: api.IConnection,
) {
  // 1. Join as platform admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a brand
  const brandBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(16),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert<IShoppingMallBrand>(brand);

  // 3. Create a multi-SKU product associated with this brand
  const productCode: string = RandomGenerator.alphaNumeric(12);

  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    short_description: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productBody,
      },
    );
  typia.assert<IShoppingMallProduct>(product);

  TestValidator.equals(
    "created product code should match requested code",
    product.code,
    productCode,
  );

  // 4. Prepare SKU create body with a specific code
  const skuCode: string = RandomGenerator.alphaNumeric(10);

  const skuCreateBody = {
    code: skuCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  // 5. First SKU creation should succeed
  const firstSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: product.code,
        body: skuCreateBody,
      },
    );
  typia.assert<IShoppingMallProductSku>(firstSku);

  TestValidator.equals(
    "first SKU productCode should match product.code",
    firstSku.productCode,
    product.code,
  );
  TestValidator.equals(
    "first SKU code should match requested skuCode",
    firstSku.code,
    skuCode,
  );

  // 6. Second SKU creation with the same code must fail
  const duplicateSkuBody = {
    code: skuCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: 11000,
    salePrice: 10000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  await TestValidator.error(
    "duplicate SKU code for same product should be rejected",
    async () => {
      await api.functional.shoppingMall.platformAdmin.products.skus.create(
        connection,
        {
          productCode: product.code,
          body: duplicateSkuBody,
        },
      );
    },
  );
}
