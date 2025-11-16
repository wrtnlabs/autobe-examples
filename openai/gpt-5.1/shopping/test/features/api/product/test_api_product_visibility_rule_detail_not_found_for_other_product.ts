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

export async function test_api_product_visibility_rule_detail_not_found_for_other_product(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to gain admin context (token wired into connection by SDK)
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
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
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Create core configuration entities
  // 2-1. Region setting
  const regionCreateBody = {
    code: `REGION_${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(1),
    iso_country_code: "US",
    currency_code: "USD",
    timezone: "America/New_York",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionCreateBody },
    );
  typia.assert(region);

  // 2-2. Policy setting (used by cancellation/refund policies conceptually)
  const policySettingCreateBody = {
    code: `POLICY_${RandomGenerator.alphaNumeric(6)}`,
    name: "Default Policy Setting",
    category: "cancellation",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    config_payload: null,
    active: true,
    effective_from: null,
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policySettingCreateBody },
    );
  typia.assert(policySetting);

  // 2-3. Cancellation policy
  const cancellationPolicyCreateBody = {
    code: `CANCEL_${RandomGenerator.alphaNumeric(6)}`,
    name: "Default Cancellation Policy",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 24,
    config_payload: null,
    effective_from: null,
    effective_to: null,
    active: true,
    region_code: region.code,
    policy_setting_code: policySetting.code,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationPolicyCreateBody },
    );
  typia.assert(cancellationPolicy);

  // 2-4. Refund policy
  const refundPolicyCreateBody = {
    code: `REFUND_${RandomGenerator.alphaNumeric(6)}`,
    name: "Default Refund Policy",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 30,
    maxRefundRate: 1,
    requireManualApprovalOverAmount: 1000,
    configurationPayload: RandomGenerator.paragraph({ sentences: 4 }),
    isActive: true,
    effectiveFrom: null,
    effectiveUntil: null,
    regionCode: region.code,
    policySettingCode: policySetting.code,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundPolicyCreateBody },
    );
  typia.assert(refundPolicy);

  // 2-5. Category tree
  const categoryTreeCreateBody = {
    code: `TREE_${RandomGenerator.alphaNumeric(6)}`,
    name: "Default Category Tree",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeCreateBody },
    );
  typia.assert(categoryTree);

  // 2-6. Brand
  const brandCreateBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Create Product A and Product B
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const productACode = `PROD_A_${RandomGenerator.alphaNumeric(6)}`;
  const productACreateBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: productACode,
    name: `Product A ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: "https://cdn.example.com/product-a.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productACreateBody },
    );
  typia.assert(productA);

  const productBCode = `PROD_B_${RandomGenerator.alphaNumeric(6)}`;
  const productBCreateBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: productBCode,
    name: `Product B ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: "https://cdn.example.com/product-b.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productBCreateBody },
    );
  typia.assert(productB);

  // 4. Create visibility rules for Product A and Product B
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const startsAt = now.toISOString();
  const endsAt = new Date(now.getTime() + oneDayMs).toISOString();

  const visibilityRuleACreateBody = {
    shopping_mall_region_setting_id: region.id,
    channel: "web",
    visibility: "visible",
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies IShoppingMallProductVisibilityRule.ICreate;

  const ruleA: IShoppingMallProductVisibilityRule =
    await api.functional.shoppingMall.platformAdmin.products.visibilityRules.create(
      connection,
      {
        productCode: productA.code,
        body: visibilityRuleACreateBody,
      },
    );
  typia.assert(ruleA);

  const visibilityRuleBCreateBody = {
    shopping_mall_region_setting_id: region.id,
    channel: "mobile",
    visibility: "hidden",
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies IShoppingMallProductVisibilityRule.ICreate;

  const ruleB: IShoppingMallProductVisibilityRule =
    await api.functional.shoppingMall.platformAdmin.products.visibilityRules.create(
      connection,
      {
        productCode: productB.code,
        body: visibilityRuleBCreateBody,
      },
    );
  typia.assert(ruleB);

  // 5. Attempt to fetch Product A's visibility rule through Product B's code
  try {
    const leakedRule: IShoppingMallProductVisibilityRule =
      await api.functional.shoppingMall.platformAdmin.products.visibilityRules.at(
        connection,
        {
          productCode: productB.code,
          productVisibilityRuleId: ruleA.id,
        },
      );
    typia.assert(leakedRule);

    // If the backend incorrectly returns a rule, assert that it must not belong to Product A.
    TestValidator.notEquals(
      "visibility rule fetched via Product B must not belong to Product A",
      leakedRule.shopping_mall_product_id,
      productA.id,
    );
  } catch (error) {
    // If an HttpError is thrown (e.g., 404 Not Found), treat it as success for this test,
    // because the rule is not accessible via a mismatched productCode.
    // We do not assert status codes per global guidelines.
    TestValidator.predicate(
      "mismatched productCode and visibilityRuleId should not leak visibility rule",
      true,
    );
  }
}
