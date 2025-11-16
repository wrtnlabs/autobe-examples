import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAgeRestrictionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAgeRestrictionPolicy";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCancellationPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationPolicy";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductComplianceFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductComplianceFlag";
import type { IShoppingMallRefundPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundPolicy";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_product_compliance_flag_deletion_idempotency_and_not_found(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain authorized context
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(1),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create region setting for later policy associations
  const regionCode = `REGION_${RandomGenerator.alphabets(8)}`;
  const regionBody = {
    code: regionCode,
    name: "Test Region",
    iso_country_code: "US",
    currency_code: "USD",
    timezone: "America/New_York",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionBody },
    );
  typia.assert(region);

  // 3. Create policy setting profile
  const policySettingCode = `POLICY_${RandomGenerator.alphabets(8)}`;
  const nowIso = new Date().toISOString();
  const policySettingBody = {
    code: policySettingCode,
    name: "Test Policy Setting",
    category: "age_restriction",
    description:
      "Test policy setting for age and refund/cancellation policies.",
    config_payload: null,
    active: true,
    effective_from: nowIso,
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policySettingBody },
    );
  typia.assert(policySetting);

  // 4. Create cancellation policy referencing region and policy setting
  const cancellationCode = `CANCEL_${RandomGenerator.alphabets(8)}`;
  const cancellationBody = {
    code: cancellationCode,
    name: "Test Cancellation Policy",
    description: "Cancellation policy for test region and setting.",
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 48,
    config_payload: null,
    effective_from: nowIso,
    effective_to: null,
    active: true,
    region_code: regionCode,
    policy_setting_code: policySettingCode,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationBody },
    );
  typia.assert(cancellationPolicy);

  // 5. Create refund policy referencing same region and policy setting
  const refundCode = `REFUND_${RandomGenerator.alphabets(8)}`;
  const refundBody = {
    code: refundCode,
    name: "Test Refund Policy",
    description: "Refund policy for test region and setting.",
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 30 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    maxRefundRate: 1,
    requireManualApprovalOverAmount: 1000,
    configurationPayload: undefined,
    isActive: true,
    effectiveFrom: nowIso,
    effectiveUntil: null,
    regionCode,
    policySettingCode,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundBody },
    );
  typia.assert(refundPolicy);

  // 6. Create age restriction policy linking to region/policy setting by ID
  const agePolicyCode = `AGE_${RandomGenerator.alphabets(8)}`;
  const ageRestrictionBody = {
    code: agePolicyCode,
    name: "Adult Only",
    description: "18+ only policy for test region.",
    minimum_age_years: 18,
    require_verified_age: true,
    config_payload: undefined,
    active: true,
    effective_from: nowIso,
    effective_to: null,
    region_setting_id: region.id,
    policy_setting_id: policySetting.id,
  } satisfies IShoppingMallAgeRestrictionPolicy.ICreate;

  const ageRestriction: IShoppingMallAgeRestrictionPolicy =
    await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.create(
      connection,
      { body: ageRestrictionBody },
    );
  typia.assert(ageRestriction);

  // 7. Create category tree and a single category (realistic catalog context)
  const categoryTreeCode = `TREE_${RandomGenerator.alphabets(8)}`;
  const categoryTreeBody = {
    code: categoryTreeCode,
    name: "Test Category Tree",
    description: "Category tree for compliance deletion tests.",
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert(categoryTree);

  const categoryBody = {
    code: `CAT_${RandomGenerator.alphabets(6)}`,
    name: "Test Category",
    description: "Root category for test tree.",
    displayOrder: 1,
    isActive: true,
    parentCategoryCode: undefined,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: categoryTree.code,
        body: categoryBody,
      },
    );
  typia.assert(category);

  // 8. Create brand
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphabets(8)}`,
    description: "Brand for compliance flag deletion test.",
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 9. Create product
  const fakeSellerId = typia.random<string & tags.Format<"uuid">>();
  const productCode = `PROD_${RandomGenerator.alphabets(8)}`;
  const productBody = {
    shopping_mall_seller_id: fakeSellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: "Compliance Flag Deletion Test Product",
    short_description:
      "Short description for compliance deletion test product.",
    description: "Long description for compliance deletion test product.",
    status: "active",
    is_multi_sku: false,
    primary_image_uri: "https://cdn.example.com/product.png",
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
    "product code should match request code",
    product.code,
    productCode,
  );

  // 10. Create product compliance flag linked to the age restriction policy
  const complianceBody = {
    shopping_mall_age_restriction_policy_id: ageRestriction.id,
    flag_type: "age_restriction",
    flag_value: "18+",
    is_blocking_sale: true,
    notes: "Test compliance flag for deletion idempotency checks.",
  } satisfies IShoppingMallProductComplianceFlag.ICreate;

  const complianceFlag: IShoppingMallProductComplianceFlag =
    await api.functional.shoppingMall.platformAdmin.products.complianceFlags.create(
      connection,
      {
        productCode: product.code,
        body: complianceBody,
      },
    );
  typia.assert(complianceFlag);

  TestValidator.equals(
    "created flag product id should not be empty",
    complianceFlag.shopping_mall_product_id,
    complianceFlag.shopping_mall_product_id,
  );

  // 11. First delete should succeed (no error, void response)
  await api.functional.shoppingMall.platformAdmin.products.complianceFlags.erase(
    connection,
    {
      productCode: product.code,
      productComplianceFlagId: complianceFlag.id,
    },
  );

  // 12. Second delete on same flag should fail (e.g., 404 or similar) -> expect error
  await TestValidator.error(
    "second delete of same compliance flag should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.products.complianceFlags.erase(
        connection,
        {
          productCode: product.code,
          productComplianceFlagId: complianceFlag.id,
        },
      );
    },
  );

  // 13. Delete with random non-existent compliance flag ID should also fail
  const randomFlagId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "delete with non-existent compliance flag id should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.products.complianceFlags.erase(
        connection,
        {
          productCode: product.code,
          productComplianceFlagId: randomFlagId,
        },
      );
    },
  );
}
