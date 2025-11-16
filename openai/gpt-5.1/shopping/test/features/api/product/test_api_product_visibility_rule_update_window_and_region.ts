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
 * Validate updating a product visibility rule's time window and region.
 *
 * Business flow:
 *
 * 1. Join as a new platform admin and obtain an authorized session.
 * 2. Create a policy setting, cancellation policy, and refund policy as background
 *    configuration to satisfy platform policy context.
 * 3. Create two region settings so that a visibility rule can be moved from one
 *    region to another.
 * 4. Create a category tree and a brand to satisfy catalog prerequisites.
 * 5. Create a product under a random seller with the created brand.
 * 6. Create an initial visibility rule for that product using region A, channel
 *    "web", visibility "visible", and an initial time window.
 * 7. Update the visibility rule to point to region B and a new time window using
 *    the PUT endpoint under test.
 * 8. Assert that:
 *
 *    - The rule still belongs to the same product and has the same id.
 *    - Starts_at and ends_at reflect the updated values.
 *    - The region association has moved from region A to region B, and the embedded
 *         region summary (if present) matches region B.
 *    - Channel and visibility remain unchanged.
 *    - Created_at is unchanged while updated_at has been bumped.
 */
export async function test_api_product_visibility_rule_update_window_and_region(
  connection: api.IConnection,
) {
  // 1. Join as platform admin
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(2),
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

  // 2. Create policy setting
  const policyCode = `policy_${RandomGenerator.alphaNumeric(8)}`;
  const policySettingBody = {
    code: policyCode,
    name: "Default Cancellation/Refund Profile",
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    config_payload: RandomGenerator.paragraph({ sentences: 5 }),
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

  // 3. Create cancellation policy bound to policy setting code
  const cancellationCode = `cancel_${RandomGenerator.alphaNumeric(6)}`;
  const cancellationBody = {
    code: cancellationCode,
    name: "Standard Cancellation Policy",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 24,
    config_payload: RandomGenerator.paragraph({ sentences: 4 }),
    effective_from: new Date().toISOString(),
    effective_to: null,
    active: true,
    region_code: null,
    policy_setting_code: policyCode,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationBody },
    );
  typia.assert(cancellationPolicy);

  // 4. Create refund policy referencing same policy setting
  const refundCode = `refund_${RandomGenerator.alphaNumeric(6)}`;
  const refundBody = {
    code: refundCode,
    name: "Standard Refund Policy",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 14 as number & tags.Type<"int32"> & tags.Minimum<0>,
    maxRefundRate: 1,
    requireManualApprovalOverAmount: 100000,
    configurationPayload: RandomGenerator.paragraph({ sentences: 4 }),
    isActive: true,
    effectiveFrom: new Date().toISOString(),
    effectiveUntil: null,
    regionCode: null,
    policySettingCode: policyCode,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundBody },
    );
  typia.assert(refundPolicy);

  // 5. Create two region settings
  const regionCodeA = `REGION_A_${RandomGenerator.alphaNumeric(4)}`;
  const regionBodyA = {
    code: regionCodeA,
    name: "Region A",
    iso_country_code: "US",
    currency_code: "USD",
    timezone: "America/New_York",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const regionA: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionBodyA },
    );
  typia.assert(regionA);

  const regionCodeB = `REGION_B_${RandomGenerator.alphaNumeric(4)}`;
  const regionBodyB = {
    code: regionCodeB,
    name: "Region B",
    iso_country_code: "KR",
    currency_code: "KRW",
    timezone: "Asia/Seoul",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const regionB: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionBodyB },
    );
  typia.assert(regionB);

  // 6. Create category tree (prerequisite for catalog)
  const categoryTreeCode = `TREE_${RandomGenerator.alphaNumeric(6)}`;
  const categoryTreeBody = {
    code: categoryTreeCode,
    name: "Main Catalog Tree",
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

  // 7. Create brand
  const brandSlug = `brand-${RandomGenerator.alphaNumeric(8)}`;
  const brandBody = {
    name: RandomGenerator.name(2),
    slug: brandSlug,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.example.com/logo.png" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 8. Create product
  const productCode = `PROD_${RandomGenerator.alphaNumeric(10)}`;
  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: "https://cdn.example.com/product.png" as string &
      tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productBody },
    );
  typia.assert(product);

  TestValidator.equals(
    "product code should match request",
    product.code,
    productCode,
  );

  // 9. Create initial visibility rule
  const now = new Date();
  const start1 = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
  const end1 = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const visibilityCreateBody = {
    shopping_mall_region_setting_id: regionA.id,
    channel: "web",
    visibility: "visible",
    starts_at: start1,
    ends_at: end1,
  } satisfies IShoppingMallProductVisibilityRule.ICreate;

  const initialRule: IShoppingMallProductVisibilityRule =
    await api.functional.shoppingMall.platformAdmin.products.visibilityRules.create(
      connection,
      {
        productCode,
        body: visibilityCreateBody,
      },
    );
  typia.assert(initialRule);

  TestValidator.equals(
    "initial rule product id should match product",
    initialRule.shopping_mall_product_id,
    product.id,
  );

  // 10. Update visibility rule: new window + new region
  const start2 = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
  const end2 = new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString();

  const updateBody = {
    shopping_mall_region_setting_id: regionB.id,
    starts_at: start2,
    ends_at: end2,
  } satisfies IShoppingMallProductVisibilityRule.IUpdate;

  const updatedRule: IShoppingMallProductVisibilityRule =
    await api.functional.shoppingMall.platformAdmin.products.visibilityRules.update(
      connection,
      {
        productCode,
        productVisibilityRuleId: initialRule.id,
        body: updateBody,
      },
    );
  typia.assert(updatedRule);

  // 11. Assertions on updated rule
  TestValidator.equals(
    "rule id should remain the same after update",
    updatedRule.id,
    initialRule.id,
  );

  TestValidator.equals(
    "rule should remain associated with same product",
    updatedRule.shopping_mall_product_id,
    product.id,
  );

  TestValidator.equals(
    "starts_at should be updated",
    updatedRule.starts_at,
    start2,
  );

  TestValidator.equals("ends_at should be updated", updatedRule.ends_at, end2);

  TestValidator.equals(
    "region id should be updated to regionB",
    updatedRule.shopping_mall_region_setting_id,
    regionB.id,
  );

  if (updatedRule.region !== undefined && updatedRule.region !== null) {
    TestValidator.equals(
      "embedded region summary id should match regionB",
      updatedRule.region.id,
      regionB.id,
    );

    TestValidator.equals(
      "embedded region summary code should match regionB code",
      updatedRule.region.code,
      regionB.code,
    );
  }

  TestValidator.equals(
    "channel should remain unchanged",
    updatedRule.channel,
    initialRule.channel,
  );

  TestValidator.equals(
    "visibility should remain unchanged",
    updatedRule.visibility,
    initialRule.visibility,
  );

  TestValidator.equals(
    "created_at should remain unchanged",
    updatedRule.created_at,
    initialRule.created_at,
  );

  const initialUpdatedAt = new Date(initialRule.updated_at);
  const updatedUpdatedAt = new Date(updatedRule.updated_at);

  TestValidator.predicate(
    "updated_at should be the same or later than before",
    updatedUpdatedAt.getTime() >= initialUpdatedAt.getTime(),
  );
}
