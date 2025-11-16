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

export async function test_api_product_visibility_rule_detail_inactive_time_window_handling(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin so that subsequent platformAdmin APIs are authorized.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
    ip: null,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Create prerequisite configuration entities: region, policy setting, cancellation & refund policies, category tree, brand.
  // 2-1. Region setting
  const regionCode = `region-${RandomGenerator.alphaNumeric(8)}`;
  const regionCreate = {
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
      { body: regionCreate },
    );
  typia.assert<IShoppingMallRegionSetting>(region);

  // 2-2. Policy setting
  const policyCode = `policy-${RandomGenerator.alphaNumeric(8)}`;
  const policyCreate = {
    code: policyCode,
    name: "Default Policy Setting",
    category: "refund",
    description: "Default refund/cancellation policy setting for tests",
    config_payload: null,
    active: true,
    effective_from: null,
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policyCreate },
    );
  typia.assert<IShoppingMallPolicySetting>(policySetting);

  // 2-3. Cancellation policy
  const cancellationPolicyCode = `cancel-${RandomGenerator.alphaNumeric(8)}`;
  const cancellationCreate = {
    code: cancellationPolicyCode,
    name: "Test Cancellation Policy",
    description: "Cancellation policy for visibility rule tests",
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 24 as number & tags.Type<"int32">,
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
      { body: cancellationCreate },
    );
  typia.assert<IShoppingMallCancellationPolicy>(cancellationPolicy);

  // 2-4. Refund policy
  const refundPolicyCode = `refund-${RandomGenerator.alphaNumeric(8)}`;
  const refundCreate = {
    code: refundPolicyCode,
    name: "Test Refund Policy",
    description: "Refund policy for visibility rule tests",
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 30 as number & tags.Type<"int32"> & tags.Minimum<0>,
    maxRefundRate: 1,
    requireManualApprovalOverAmount: 1000,
    configurationPayload: "{}",
    isActive: true,
    effectiveFrom: null,
    effectiveUntil: null,
    regionCode: region.code,
    policySettingCode: policySetting.code,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundCreate },
    );
  typia.assert<IShoppingMallRefundPolicy>(refundPolicy);

  // 2-5. Category tree
  const categoryTreeCode = `tree-${RandomGenerator.alphaNumeric(8)}`;
  const categoryTreeCreate = {
    code: categoryTreeCode,
    name: "Main Test Tree",
    description: "Category tree for visibility rule tests",
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeCreate },
    );
  typia.assert<IShoppingMallCategoryTree>(categoryTree);

  // 2-6. Brand
  const brandCreate = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(10)}`,
    description: "Test brand for visibility rule scenario",
    logo_uri: "https://cdn.example.com/logo.png" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreate,
    });
  typia.assert<IShoppingMallBrand>(brand);

  // 3. Create a product associated with a (synthetic) seller and the created brand.
  const syntheticSellerId = typia.random<string & tags.Format<"uuid">>();
  const productCode = `prod-${RandomGenerator.alphaNumeric(10)}` as string &
    tags.MinLength<1>;
  const productName = `Product ${RandomGenerator.name(1)}` as string &
    tags.MinLength<1>;
  const productStatus = "active" as string & tags.MinLength<1>;

  const productCreate = {
    shopping_mall_seller_id: syntheticSellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: productName,
    short_description: "Short description for visibility rule test product",
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: productStatus,
    is_multi_sku: false,
    primary_image_uri: "https://cdn.example.com/product.png" as string &
      tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productCreate,
      },
    );
  typia.assert<IShoppingMallProduct>(product);

  TestValidator.equals(
    "created product code matches request",
    product.code,
    productCode,
  );

  // 4. Create two visibility rules (ACTIVE and FUTURE) for the product.
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  const activeStartsAt = new Date(now.getTime() - dayMs).toISOString();
  const activeEndsAt = new Date(now.getTime() + dayMs).toISOString();

  const futureStartsAt = new Date(now.getTime() + 10 * dayMs).toISOString();
  const futureEndsAt = new Date(now.getTime() + 20 * dayMs).toISOString();

  // ACTIVE rule (time window includes now)
  const activeRuleCreate = {
    shopping_mall_region_setting_id: region.id,
    channel: "web",
    visibility: "visible",
    starts_at: activeStartsAt,
    ends_at: activeEndsAt,
  } satisfies IShoppingMallProductVisibilityRule.ICreate;

  const activeRule: IShoppingMallProductVisibilityRule =
    await api.functional.shoppingMall.platformAdmin.products.visibilityRules.create(
      connection,
      {
        productCode: product.code,
        body: activeRuleCreate,
      },
    );
  typia.assert<IShoppingMallProductVisibilityRule>(activeRule);

  // FUTURE rule (time window excludes now)
  const futureRuleCreate = {
    shopping_mall_region_setting_id: region.id,
    channel: "web",
    visibility: "visible",
    starts_at: futureStartsAt,
    ends_at: futureEndsAt,
  } satisfies IShoppingMallProductVisibilityRule.ICreate;

  const futureRule: IShoppingMallProductVisibilityRule =
    await api.functional.shoppingMall.platformAdmin.products.visibilityRules.create(
      connection,
      {
        productCode: product.code,
        body: futureRuleCreate,
      },
    );
  typia.assert<IShoppingMallProductVisibilityRule>(futureRule);

  TestValidator.notEquals(
    "active and future visibility rules must have different ids",
    activeRule.id,
    futureRule.id,
  );

  TestValidator.notEquals(
    "active and future visibility rules must have different starts_at",
    activeRule.starts_at,
    futureRule.starts_at,
  );

  // 5. Call the detail endpoint for the FUTURE rule and assert 200 behavior.
  const fetched: IShoppingMallProductVisibilityRule =
    await api.functional.shoppingMall.platformAdmin.products.visibilityRules.at(
      connection,
      {
        productCode: product.code,
        productVisibilityRuleId: futureRule.id,
      },
    );
  typia.assert<IShoppingMallProductVisibilityRule>(fetched);

  // 6. Assert that the fetched rule matches the created FUTURE rule and that product ownership is correct.
  TestValidator.equals(
    "fetched rule id matches future rule id",
    fetched.id,
    futureRule.id,
  );

  TestValidator.equals(
    "fetched rule product id matches active rule product id",
    fetched.shopping_mall_product_id,
    activeRule.shopping_mall_product_id,
  );

  TestValidator.equals(
    "fetched visibility equals future visibility",
    fetched.visibility,
    futureRule.visibility,
  );

  TestValidator.equals(
    "fetched channel equals future channel",
    fetched.channel,
    futureRule.channel,
  );

  if (fetched.region !== undefined && fetched.region !== null) {
    TestValidator.equals(
      "fetched region summary id matches created region id",
      fetched.region.id,
      region.id,
    );
  }

  TestValidator.equals(
    "fetched starts_at equals future rule starts_at",
    fetched.starts_at,
    futureRule.starts_at,
  );

  TestValidator.equals(
    "fetched ends_at equals future rule ends_at",
    fetched.ends_at,
    futureRule.ends_at,
  );
}
