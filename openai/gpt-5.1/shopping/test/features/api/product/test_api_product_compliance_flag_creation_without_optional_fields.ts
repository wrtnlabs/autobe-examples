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

/** Create non-age-related product compliance flag with minimal required fields. */
export async function test_api_product_compliance_flag_creation_without_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as platform administrator
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a category tree (prerequisite, even if unused later)
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog Tree",
    description: RandomGenerator.paragraph({ sentences: 5 }),
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
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(10)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/brand-logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 4. Create a product using a random seller UUID (since seller creation API is not available here)
  const sellerId = typia.random<string>();

  const productCode = `PROD-${RandomGenerator.alphaNumeric(12)}`;

  const productBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Product ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: "https://cdn.example.com/product-image.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productBody,
      },
    );
  typia.assert(product);

  TestValidator.equals(
    "created product code should match request",
    product.code,
    productBody.code,
  );

  // 5. Create a compliance flag with only required fields
  const requestedFlagType = "hazardous_material";
  const flagBody = {
    flag_type: requestedFlagType,
    is_blocking_sale: false,
  } satisfies IShoppingMallProductComplianceFlag.ICreate;

  const flag: IShoppingMallProductComplianceFlag =
    await api.functional.shoppingMall.platformAdmin.products.complianceFlags.create(
      connection,
      {
        productCode: product.code,
        body: flagBody,
      },
    );
  typia.assert(flag);

  // 6. Assertions on the created compliance flag
  TestValidator.predicate(
    "compliance flag id should be a non-empty string",
    flag.id.length > 0,
  );

  TestValidator.predicate(
    "compliance flag should be attached to some product id",
    flag.shopping_mall_product_id.length > 0,
  );

  TestValidator.equals(
    "flag_type should match requested flag_type",
    flag.flag_type,
    requestedFlagType,
  );

  TestValidator.equals(
    "is_blocking_sale should be false as requested",
    flag.is_blocking_sale,
    false,
  );

  TestValidator.predicate(
    "age restriction policy id should be null or undefined when omitted",
    flag.shopping_mall_age_restriction_policy_id === null ||
      flag.shopping_mall_age_restriction_policy_id === undefined,
  );

  TestValidator.predicate(
    "flag_value should be null or undefined when omitted",
    flag.flag_value === null || flag.flag_value === undefined,
  );

  TestValidator.predicate(
    "notes should be null or undefined when omitted",
    flag.notes === null || flag.notes === undefined,
  );

  TestValidator.predicate(
    "created_at should be a non-empty date-time string",
    flag.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at should be a non-empty date-time string",
    flag.updated_at.length > 0,
  );
}
