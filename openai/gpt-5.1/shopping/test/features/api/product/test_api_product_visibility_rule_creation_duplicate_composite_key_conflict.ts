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
 * Validate conflict on duplicate product visibility rule creation.
 *
 * Business goal: Ensure that trying to create a second product visibility rule
 * with the same composite key (product, region, channel, starts_at, ends_at)
 * fails with a business error rather than silently creating a duplicate row.
 *
 * High-level flow:
 *
 * 1. Join as a platform admin to obtain an authorized connection.
 * 2. Create prerequisite configuration entities (policy setting, cancellation
 *    policy, refund policy, region setting, category tree, brand).
 * 3. Create a product tied to the brand (seller id is a random UUID since the
 *    seller-creation API is not exposed in this context).
 * 4. Create an initial visibility rule for that product with a specific (region,
 *    channel, visibility, starts_at, ends_at) combination.
 * 5. Attempt to create a second visibility rule with exactly the same composite
 *    key.
 * 6. Assert that the second creation attempt throws an error, indicating a
 *    unique-constraint or business-level conflict.
 */
export async function test_api_product_visibility_rule_creation_duplicate_composite_key_conflict(
  connection: api.IConnection,
) {
  // 1. Join as platform admin (authorization handled by SDK, connection mutated)
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.test`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.test/join", // valid URI
    referrer: "https://shoppingmall.test/landing", // valid URI
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create policy setting
  const policySettingCode = `policy_${RandomGenerator.alphaNumeric(8)}`;
  const policySettingBody = {
    code: policySettingCode,
    name: "Default Cancellation/Refund Profile",
    category: "cancellation_refund_profile",
    description: RandomGenerator.paragraph({ sentences: 4 }),
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
  const cancellationPolicyCode = `cancel_${RandomGenerator.alphaNumeric(6)}`;
  const cancellationBody = {
    code: cancellationPolicyCode,
    name: "Standard Cancellation",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 72,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    effective_from: new Date().toISOString(),
    effective_to: null,
    active: true,
    region_code: null,
    policy_setting_code: policySettingCode,
  } satisfies IShoppingMallCancellationPolicy.ICreate;
  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationBody },
    );
  typia.assert(cancellationPolicy);

  // 4. Create refund policy referencing same policy setting (regionCode null)
  const refundPolicyCode = `refund_${RandomGenerator.alphaNumeric(6)}`;
  const refundBody = {
    code: refundPolicyCode,
    name: "Standard Refund",
    description: RandomGenerator.paragraph({ sentences: 3 }),
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
    policySettingCode: policySettingCode,
  } satisfies IShoppingMallRefundPolicy.ICreate;
  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundBody },
    );
  typia.assert(refundPolicy);

  // 5. Create region setting (to be referenced by visibility rules)
  const regionCode = `REG_${RandomGenerator.alphaNumeric(4).toUpperCase()}`;
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

  // 6. Create category tree (not strictly needed for visibility but part of config chain)
  const categoryTreeCode = `tree_${RandomGenerator.alphaNumeric(6)}`;
  const categoryTreeBody = {
    code: categoryTreeCode,
    name: "Default Category Tree",
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

  // 7. Create brand
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.shoppingmall.test/logo.png",
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 8. Create product owned by a synthetic seller and associated with the brand
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const productCode = `P_${RandomGenerator.alphaNumeric(10)}`;
  const productBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: "Visibility Rule Test Product",
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri:
      "https://cdn.shoppingmall.test/products/test-product.jpg",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productBody },
    );
  typia.assert(product);
  TestValidator.equals(
    "product code should match requested code",
    product.code,
    productCode,
  );

  // 9. Create initial product visibility rule
  const now = new Date();
  const startsAt = now.toISOString();
  const endsAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  const visibilityCreateBody = {
    shopping_mall_region_setting_id: region.id,
    channel: "web",
    visibility: "visible",
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies IShoppingMallProductVisibilityRule.ICreate;

  const firstRule: IShoppingMallProductVisibilityRule =
    await api.functional.shoppingMall.platformAdmin.products.visibilityRules.create(
      connection,
      {
        productCode: product.code,
        body: visibilityCreateBody,
      },
    );
  typia.assert(firstRule);

  // 10. Attempt duplicate rule creation with identical composite key and
  // expect an error due to uniqueness constraint.
  await TestValidator.error(
    "duplicate visibility rule with same composite key should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.products.visibilityRules.create(
        connection,
        {
          productCode: product.code,
          body: visibilityCreateBody,
        },
      );
    },
  );
}
