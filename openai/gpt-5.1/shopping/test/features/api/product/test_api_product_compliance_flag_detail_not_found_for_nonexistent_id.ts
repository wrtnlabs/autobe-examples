import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAgeRestrictionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAgeRestrictionPolicy";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCancellationPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationPolicy";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductComplianceFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductComplianceFlag";
import type { IShoppingMallRefundPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundPolicy";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that retrieving a product compliance flag by a non-existent id for
 * an existing product results in an error (not-found-like behavior), while an
 * existing flag for the same product can be successfully fetched.
 *
 * Business flow:
 *
 * 1. Join as a platform admin to obtain an authenticated context.
 * 2. Optionally create some background configuration entities (region setting,
 *    policy settings, etc.) for realism.
 * 3. Create a brand.
 * 4. Create a product owned by a synthetic seller id and associated with the
 *    created brand.
 * 5. Create one real compliance flag for the product.
 * 6. Fetch that real compliance flag by id (happy path) and assert the response
 *    shape.
 * 7. Generate a random UUID that is not used for any created compliance flag id.
 * 8. Attempt to fetch a compliance flag for the same product using the
 *    non-existent id and assert that the call throws an error.
 */
export async function test_api_product_compliance_flag_detail_not_found_for_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. Join as platform admin (SDK manages token in connection.headers).
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Optional background setup: region setting, policy setting, etc.
  const regionCreate = {
    code: `REGION_${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(2),
    iso_country_code: "US",
    currency_code: "USD",
    timezone: "America/New_York",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;
  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionCreate },
    );
  typia.assert(region);

  const policySettingCreate = {
    code: `POLICY_${RandomGenerator.alphaNumeric(6)}`,
    name: "Default Policy Setting",
    category: "compliance",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: null,
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;
  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policySettingCreate },
    );
  typia.assert(policySetting);

  const cancellationPolicyCreate = {
    code: `CANCEL_${RandomGenerator.alphaNumeric(6)}`,
    name: "Default Cancellation Policy",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 48,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    effective_from: null,
    effective_to: null,
    active: true,
    region_code: region.code,
    policy_setting_code: policySetting.code,
  } satisfies IShoppingMallCancellationPolicy.ICreate;
  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationPolicyCreate },
    );
  typia.assert(cancellationPolicy);

  const refundPolicyCreate = {
    code: `REFUND_${RandomGenerator.alphaNumeric(6)}`,
    name: "Default Refund Policy",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 30,
    maxRefundRate: 1,
    requireManualApprovalOverAmount: 100000,
    configurationPayload: RandomGenerator.content({ paragraphs: 1 }),
    isActive: true,
    effectiveFrom: null,
    effectiveUntil: null,
    regionCode: region.code,
    policySettingCode: policySetting.code,
  } satisfies IShoppingMallRefundPolicy.ICreate;
  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundPolicyCreate },
    );
  typia.assert(refundPolicy);

  const ageRestrictionCreate = {
    code: `AGE_${RandomGenerator.alphaNumeric(6)}`,
    name: "Adult Only",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    minimum_age_years: 19,
    require_verified_age: true,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: null,
    effective_to: null,
    region_setting_id: region.id,
    policy_setting_id: null,
  } satisfies IShoppingMallAgeRestrictionPolicy.ICreate;
  const ageRestrictionPolicy: IShoppingMallAgeRestrictionPolicy =
    await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.create(
      connection,
      { body: ageRestrictionCreate },
    );
  typia.assert(ageRestrictionPolicy);

  const categoryTreeCreate = {
    code: `TREE_${RandomGenerator.alphaNumeric(6)}`,
    name: "Main Catalog",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;
  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeCreate },
    );
  typia.assert(categoryTree);

  // 3. Create a brand.
  const brandCreate = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.shoppingmall.test/logo.png",
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreate,
    });
  typia.assert(brand);

  // 4. Create a product with synthetic seller id and this brand.
  const syntheticSellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const productCreate = {
    shopping_mall_seller_id: syntheticSellerId,
    shopping_mall_brand_id: brand.id,
    code: `PROD_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: "https://cdn.shoppingmall.test/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productCreate },
    );
  typia.assert(product);

  // 5. Create a real compliance flag for the product.
  const realFlagCreate = {
    shopping_mall_age_restriction_policy_id: ageRestrictionPolicy.id,
    flag_type: "age_restriction",
    flag_value: "adult_only",
    is_blocking_sale: true,
    notes: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallProductComplianceFlag.ICreate;
  const realFlag: IShoppingMallProductComplianceFlag =
    await api.functional.shoppingMall.platformAdmin.products.complianceFlags.create(
      connection,
      {
        productCode: product.code,
        body: realFlagCreate,
      },
    );
  typia.assert(realFlag);

  // 6. Happy-path: retrieve the real flag by its id.
  const fetchedReal: IShoppingMallProductComplianceFlag =
    await api.functional.shoppingMall.platformAdmin.products.complianceFlags.at(
      connection,
      {
        productCode: product.code,
        productComplianceFlagId: realFlag.id,
      },
    );
  typia.assert(fetchedReal);
  TestValidator.equals(
    "existing compliance flag can be fetched by id",
    fetchedReal,
    realFlag,
  );

  // 7. Generate a non-existent compliance flag id (never used in any create).
  const nonexistentFlagId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  TestValidator.notEquals(
    "nonexistent flag id should differ from real flag id",
    nonexistentFlagId,
    realFlag.id,
  );

  // 8. Attempt to get compliance flag with non-existent id and expect error.
  await TestValidator.error(
    "requesting compliance flag by non-existent id should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.products.complianceFlags.at(
        connection,
        {
          productCode: product.code,
          productComplianceFlagId: nonexistentFlagId,
        },
      );
    },
  );
}
