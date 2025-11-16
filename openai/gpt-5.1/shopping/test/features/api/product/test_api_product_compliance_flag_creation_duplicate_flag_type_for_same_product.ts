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
 * Validate that creating a second compliance flag with the same flag_type for
 * the same product fails due to the unique (product, flag_type) constraint on
 * shopping_mall_product_compliance_flags.
 *
 * Business workflow covered:
 *
 * 1. Join as a platform admin and obtain an authorized context.
 * 2. Create a category tree for catalog configuration (precondition for a
 *    realistic catalog environment, even if not directly referenced by the
 *    product APIs here).
 * 3. Create a brand to be associated with the test product.
 * 4. Create a product with a unique product code and link it to the created brand.
 * 5. Create the first compliance flag of type "age_restriction" for the product
 *    and verify success.
 * 6. Attempt to create a second compliance flag with the same flag_type for the
 *    same product and verify that the call fails (domain error / uniqueness
 *    violation) using TestValidator.error.
 */
export async function test_api_product_compliance_flag_creation_duplicate_flag_type_for_same_product(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a category tree (not strictly required by the subsequent
  // APIs, but keeps the catalog environment realistic).
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeBody,
      },
    );
  typia.assert(categoryTree);

  // 3. Create a brand
  const brandBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: `brand-${RandomGenerator.alphaNumeric(10)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 4. Create a product associated with the created brand.
  // Note: We don't have an API to create sellers, so we use a random
  // UUID for shopping_mall_seller_id and assume the environment either
  // seeds valid sellers or allows platformAdmin-created products to
  // reference arbitrary seller IDs for testing purposes.
  const productCode = `prod-${RandomGenerator.alphaNumeric(12)}`;

  const productCreateBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productCreateBody,
      },
    );
  typia.assert(product);

  // Sanity check: the created product should have the same code we
  // requested, and a non-empty id.
  TestValidator.equals(
    "created product code must match input",
    product.code,
    productCode,
  );
  TestValidator.predicate(
    "product id must be a non-empty string",
    product.id.length > 0,
  );

  // 5. Create the first compliance flag for the product
  const firstFlagBody = {
    shopping_mall_age_restriction_policy_id: null,
    flag_type: "age_restriction",
    flag_value: "18+",
    is_blocking_sale: true,
    notes: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallProductComplianceFlag.ICreate;

  const firstFlag: IShoppingMallProductComplianceFlag =
    await api.functional.shoppingMall.platformAdmin.products.complianceFlags.create(
      connection,
      {
        productCode: product.code,
        body: firstFlagBody,
      },
    );
  typia.assert(firstFlag);

  // Sanity check: verify the first flag is for the expected product
  TestValidator.equals(
    "first compliance flag's flag_type must be age_restriction",
    firstFlag.flag_type,
    "age_restriction",
  );
  TestValidator.equals(
    "first compliance flag must have blocking sale set to true",
    firstFlag.is_blocking_sale,
    true,
  );

  // 6. Attempt to create a second compliance flag with the same
  // flag_type for the same product. This should fail due to the
  // unique (shopping_mall_product_id, flag_type) constraint.
  const duplicateFlagBody = {
    shopping_mall_age_restriction_policy_id: null,
    flag_type: "age_restriction",
    flag_value: "21+",
    is_blocking_sale: false,
    notes: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallProductComplianceFlag.ICreate;

  await TestValidator.error(
    "duplicate product compliance flag type must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.products.complianceFlags.create(
        connection,
        {
          productCode: product.code,
          body: duplicateFlagBody,
        },
      );
    },
  );
}
