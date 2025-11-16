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
import type { IShoppingMallProductComplianceFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductComplianceFlag";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that updating a product compliance flag cannot violate the composite
 * uniqueness constraint on (product, flag_type).
 *
 * Business goal:
 *
 * - A product can have at most one compliance flag for a given flag_type (unique
 *   index on [shopping_mall_product_id, flag_type]).
 * - If an update tries to change a flag's flag_type so that it duplicates another
 *   flag on the same product, the backend must reject it with a domain error
 *   instead of silently overwriting or allowing duplicate flags.
 *
 * Scenario steps:
 *
 * 1. Join as a platform admin to obtain an authenticated admin session.
 * 2. Create a category tree (catalog prerequisite, even if not structurally
 *    required for the product DTO here).
 * 3. Create a brand using the platformAdmin brand creation endpoint.
 * 4. Create a product owned by a (synthetic) seller, associated to the created
 *    brand, with a unique product code and required attributes.
 * 5. For that product, create two compliance flags:
 *
 *    - Flag A with flag_type "hazardous_material" and is_blocking_sale = true.
 *    - Flag B with flag_type "region_restriction" and is_blocking_sale = false.
 *         Assert that both flags reference the same product and have distinct
 *         IDs and flag_type values.
 * 6. Attempt to update Flag B's flag_type to "hazardous_material" using the PUT
 *    /shoppingMall/platformAdmin/products/{productCode}/complianceFlags/{productComplianceFlagId}
 *    endpoint with IShoppingMallProductComplianceFlag.IUpdate.
 * 7. Expect the update operation to fail (throw), using TestValidator.error with
 *    an async closure around the update call. Do NOT assert any specific HTTP
 *    status code; only assert that an error occurs.
 * 8. Confirm that our previously retrieved flag objects are still valid via
 *    typia.assert (we cannot re-read from the API because no read/list
 *    endpoints are provided in the materials).
 */
export async function test_api_product_compliance_flag_update_conflicting_flag_type_for_same_product(
  connection: api.IConnection,
) {
  // 1. Join as platform admin (auth + token injection handled by SDK)
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a category tree (prerequisite, not directly used later)
  const categoryTreeBody = {
    code: `cat-tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog Tree",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert(categoryTree);

  // 3. Create a brand
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(10)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.shoppingmall.test/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 4. Create a product associated with the brand
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const productCode = `prod-${RandomGenerator.alphaNumeric(10)}`;

  const productBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Product ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: "https://cdn.shoppingmall.test/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productBody },
    );
  typia.assert(product);

  TestValidator.equals(
    "created product code should match input code",
    product.code,
    productCode,
  );

  // 5. Create two compliance flags for the same product
  const flagABody = {
    shopping_mall_age_restriction_policy_id: null,
    flag_type: "hazardous_material",
    flag_value: null,
    is_blocking_sale: true,
    notes: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallProductComplianceFlag.ICreate;

  const flagA: IShoppingMallProductComplianceFlag =
    await api.functional.shoppingMall.platformAdmin.products.complianceFlags.create(
      connection,
      {
        productCode: product.code,
        body: flagABody,
      },
    );
  typia.assert(flagA);

  const flagBBody = {
    shopping_mall_age_restriction_policy_id: null,
    flag_type: "region_restriction",
    flag_value: null,
    is_blocking_sale: false,
    notes: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallProductComplianceFlag.ICreate;

  const flagB: IShoppingMallProductComplianceFlag =
    await api.functional.shoppingMall.platformAdmin.products.complianceFlags.create(
      connection,
      {
        productCode: product.code,
        body: flagBBody,
      },
    );
  typia.assert(flagB);

  // Sanity checks: same product, different ids and flag types
  TestValidator.equals(
    "flag A should belong to created product",
    flagA.shopping_mall_product_id,
    flagB.shopping_mall_product_id,
  );

  TestValidator.notEquals(
    "flag A and flag B ids should differ",
    flagA.id,
    flagB.id,
  );

  TestValidator.notEquals(
    "flag A and flag B flag_type should differ before update",
    flagA.flag_type,
    flagB.flag_type,
  );

  // 6-7. Attempt to update Flag B's flag_type to conflicting value and expect error
  await TestValidator.error(
    "updating compliance flag to duplicate flag_type for same product must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.products.complianceFlags.update(
        connection,
        {
          productCode: product.code,
          productComplianceFlagId: flagB.id,
          body: {
            flag_type: "hazardous_material",
          } satisfies IShoppingMallProductComplianceFlag.IUpdate,
        },
      );
    },
  );

  // 8. Re-assert original flags are still structurally valid in memory
  typia.assert<IShoppingMallProductComplianceFlag>(flagA);
  typia.assert<IShoppingMallProductComplianceFlag>(flagB);
}
