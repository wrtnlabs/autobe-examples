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

/**
 * Validate creation of a global (non-region-scoped) product visibility rule.
 *
 * Business goals
 *
 * 1. Ensure a platform admin can join and obtain an authorized session.
 * 2. Ensure prerequisite catalog and policy configuration entities can be created
 *    under the platform admin context (policy setting, cancellation/refund
 *    policies, category tree, and brand).
 * 3. Create a product that will own the visibility rule.
 * 4. Create a visibility rule for that product without binding it to any region
 *    (shopping_mall_region_setting_id omitted), so it applies globally.
 * 5. Verify that the created rule is correctly persisted and that region
 *    information is null/undefined while channel, visibility, and
 *    starts_at/ends_at match the request semantics.
 */
export async function test_api_product_visibility_rule_creation_without_region_global_scope(
  connection: api.IConnection,
) {
  // 1. Platform admin join (authentication bootstrap)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Create policy setting
  const policySettingBody = {
    code: `policy_${RandomGenerator.alphaNumeric(8)}`,
    name: `Default Policy ${RandomGenerator.alphaNumeric(4)}`,
    category: "visibility_test",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: new Date().toISOString(),
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policySettingBody },
    );
  typia.assert(policySetting);

  // 3. Create cancellation policy referencing the policy setting by code
  const cancellationPolicyBody = {
    code: `cancel_${RandomGenerator.alphaNumeric(8)}`,
    name: `Cancellation Policy ${RandomGenerator.alphaNumeric(4)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 48,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    effective_from: new Date().toISOString(),
    effective_to: null,
    active: true,
    region_code: null,
    policy_setting_code: policySetting.code,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationPolicyBody },
    );
  typia.assert(cancellationPolicy);

  // 4. Create refund policy referencing the same policy setting
  const refundPolicyBody = {
    code: `refund_${RandomGenerator.alphaNumeric(8)}`,
    name: `Refund Policy ${RandomGenerator.alphaNumeric(4)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 30,
    maxRefundRate: 1.0,
    requireManualApprovalOverAmount: 100000,
    configurationPayload: RandomGenerator.content({ paragraphs: 1 }),
    isActive: true,
    effectiveFrom: new Date().toISOString(),
    effectiveUntil: null,
    regionCode: null,
    policySettingCode: policySetting.code,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundPolicyBody },
    );
  typia.assert(refundPolicy);

  // 5. Create category tree
  const categoryTreeBody = {
    code: `tree_${RandomGenerator.alphaNumeric(8)}`,
    name: `Main Tree ${RandomGenerator.alphaNumeric(4)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert(categoryTree);

  // 6. Create brand
  const brandBody = {
    name: `Brand ${RandomGenerator.alphaNumeric(6)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.shoppingmall.test/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 7. Create a product that will own the visibility rule.
  //    We do not have a seller creation API in this context, so we rely on
  //    typia.random for a valid seller id, and focus the test on visibility
  //    rule behavior, not seller lifecycle.
  const productCode = `prod_${RandomGenerator.alphaNumeric(10)}`;
  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: "https://cdn.shoppingmall.test/product.png",
    additional_data: RandomGenerator.content({ paragraphs: 1 }),
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
    "created product code should match request code",
    product.code,
    productCode,
  );

  // 8. Create global visibility rule (no region setting id)
  const nowIso = new Date().toISOString();
  const visibilityRuleBody = {
    // shopping_mall_region_setting_id intentionally omitted for global scope
    channel: "mobile",
    visibility: "hidden",
    starts_at: nowIso,
    ends_at: null,
  } satisfies IShoppingMallProductVisibilityRule.ICreate;

  const rule: IShoppingMallProductVisibilityRule =
    await api.functional.shoppingMall.platformAdmin.products.visibilityRules.create(
      connection,
      {
        productCode: product.code,
        body: visibilityRuleBody,
      },
    );
  typia.assert(rule);

  // 9. Validate global scope and field echoing
  TestValidator.equals(
    "visibility rule should belong to created product",
    rule.shopping_mall_product_id,
    product.id,
  );

  TestValidator.predicate(
    "shopping_mall_region_setting_id should be null or undefined for global rule",
    rule.shopping_mall_region_setting_id === null ||
      rule.shopping_mall_region_setting_id === undefined,
  );

  TestValidator.predicate(
    "region summary should be null or undefined for global rule",
    rule.region === null || rule.region === undefined,
  );

  TestValidator.equals(
    "channel should match request body",
    rule.channel ?? null,
    visibilityRuleBody.channel ?? null,
  );

  TestValidator.equals(
    "visibility should match request body",
    rule.visibility,
    visibilityRuleBody.visibility,
  );

  TestValidator.equals(
    "starts_at should match request body",
    rule.starts_at ?? null,
    visibilityRuleBody.starts_at ?? null,
  );

  TestValidator.equals(
    "ends_at should match request body (null for open-ended rule)",
    rule.ends_at ?? null,
    visibilityRuleBody.ends_at ?? null,
  );

  TestValidator.predicate(
    "created_at should be a non-empty ISO string",
    typeof rule.created_at === "string" && rule.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at should be a non-empty ISO string",
    typeof rule.updated_at === "string" && rule.updated_at.length > 0,
  );
}
