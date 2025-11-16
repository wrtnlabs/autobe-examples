import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCancellationPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationPolicy";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVisibilityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVisibilityRule";
import type { IShoppingMallRefundPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundPolicy";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_product_visibility_rule_creation_by_platform_admin_with_region_and_channel(
  connection: api.IConnection,
) {
  // 1. Join a new platform admin to authenticate subsequent admin operations
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a policy setting profile (not directly used later but matches prerequisites)
  const policySettingCode = `policy_${RandomGenerator.alphaNumeric(12)}`;
  const policySettingCreateBody = {
    code: policySettingCode,
    name: "Default Cancellation/Refund Profile",
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    config_payload: RandomGenerator.paragraph({ sentences: 8 }),
    active: true,
    effective_from: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policySettingCreateBody },
    );
  typia.assert(policySetting);

  // 3. Create a cancellation policy
  const cancellationPolicyCode = `cancel_${RandomGenerator.alphaNumeric(10)}`;
  const cancellationPolicyBody = {
    code: cancellationPolicyCode,
    name: "Default Global Cancellation Policy",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 72,
    config_payload: RandomGenerator.paragraph({ sentences: 6 }),
    effective_from: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    effective_to: null,
    active: true,
    region_code: null,
    policy_setting_code: policySettingCode,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationPolicyBody },
    );
  typia.assert(cancellationPolicy);

  // 4. Create a refund policy
  const refundPolicyCode = `refund_${RandomGenerator.alphaNumeric(10)}`;
  const refundPolicyBody = {
    code: refundPolicyCode,
    name: "Default Refund Policy",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 30,
    maxRefundRate: 1.0,
    requireManualApprovalOverAmount: 100000,
    configurationPayload: RandomGenerator.paragraph({ sentences: 10 }),
    isActive: true,
    effectiveFrom: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    effectiveUntil: null,
    regionCode: null,
    policySettingCode: policySettingCode,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundPolicyBody },
    );
  typia.assert(refundPolicy);

  // 5. Create a region configuration
  const regionCode = "EU_MARKET";
  const regionCreateBody = {
    code: regionCode,
    name: "European Union",
    iso_country_code: null,
    currency_code: "EUR",
    timezone: "Europe/Berlin",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionCreateBody },
    );
  typia.assert(region);

  // 6. Create a category tree
  const categoryTreeCode = `tree_${RandomGenerator.alphaNumeric(10)}`;
  const categoryTreeBody = {
    code: categoryTreeCode,
    name: "Global Catalog Tree",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert(categoryTree);

  // 7. Create a brand
  const brandCreateBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(10)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/brands/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 8-9. Create a product. We need a seller id, but no seller-creation API is available.
  // Use typia.random<ICreate>() to rely on test fixtures for a valid seller.
  const randomProductCreate: IShoppingMallProduct.ICreate =
    typia.random<IShoppingMallProduct.ICreate>();

  // Override brand and code/name to have deterministic assertions while
  // preserving a valid seller id from the random payload.
  const productCode = `prod_${RandomGenerator.alphaNumeric(10)}`;
  const productCreateBody = {
    ...randomProductCreate,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Test Product ${RandomGenerator.name(1)}`,
    status: "active",
    is_multi_sku: false,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productCreateBody,
      },
    );
  typia.assert(product);

  TestValidator.equals(
    "product code should match requested code",
    product.code,
    productCode,
  );

  // 10. Prepare visibility rule body
  const now = Date.now();
  const startsAt = new Date(now - 5 * 60 * 1000).toISOString();

  const visibilityRuleCreateBody = {
    shopping_mall_region_setting_id: region.id,
    channel: "web",
    visibility: "visible",
    starts_at: startsAt,
    ends_at: null,
  } satisfies IShoppingMallProductVisibilityRule.ICreate;

  // 11. Create visibility rule
  const visibilityRule: IShoppingMallProductVisibilityRule =
    await api.functional.shoppingMall.platformAdmin.products.visibilityRules.create(
      connection,
      {
        productCode: product.code,
        body: visibilityRuleCreateBody,
      },
    );
  typia.assert(visibilityRule);

  // 13. Assertions on visibility rule
  TestValidator.equals(
    "visibility rule should reference correct product id",
    visibilityRule.shopping_mall_product_id,
    product.id,
  );

  // Region summary should match created region
  TestValidator.predicate(
    "visibility rule region summary should be present",
    visibilityRule.region !== null && visibilityRule.region !== undefined,
  );

  if (visibilityRule.region !== null && visibilityRule.region !== undefined) {
    TestValidator.equals(
      "region id should match",
      visibilityRule.region.id,
      region.id,
    );
    TestValidator.equals(
      "region code should match",
      visibilityRule.region.code,
      region.code,
    );
    TestValidator.equals(
      "region name should match",
      visibilityRule.region.name,
      region.name,
    );
    TestValidator.equals(
      "region active flag should match",
      visibilityRule.region.active,
      region.active,
    );
  }

  TestValidator.equals(
    "channel should match requested value",
    visibilityRule.channel,
    visibilityRuleCreateBody.channel,
  );
  TestValidator.equals(
    "visibility state should match requested value",
    visibilityRule.visibility,
    visibilityRuleCreateBody.visibility,
  );
  TestValidator.equals(
    "starts_at should match requested value",
    visibilityRule.starts_at,
    visibilityRuleCreateBody.starts_at,
  );
  TestValidator.equals(
    "ends_at should be null for open-ended rule",
    visibilityRule.ends_at,
    visibilityRuleCreateBody.ends_at,
  );
}
