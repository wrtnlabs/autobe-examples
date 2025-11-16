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

export async function test_api_product_visibility_rule_detail_by_platform_admin_happy_path(
  connection: api.IConnection,
) {
  // 1. Join as a new platform admin (establishes Authorization header via SDK)
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a policy setting (prerequisite, though not directly used later)
  const policySettingCreate = {
    code: `policy_${RandomGenerator.alphaNumeric(8)}`,
    name: "Default Cancellation/Refund Profile",
    category: "refund_and_cancellation",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    config_payload: JSON.stringify({ version: 1, rules: [] }),
    active: true,
    effective_from: new Date().toISOString(),
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policySettingCreate },
    );
  typia.assert(policySetting);

  // 3. Create a region setting (will be referenced by visibility rule and possibly policies)
  const regionCreate = {
    code: `REGION_${RandomGenerator.alphaNumeric(6)}`,
    name: "Korea / Asia Market",
    iso_country_code: "KR",
    currency_code: "KRW",
    timezone: "Asia/Seoul",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionCreate },
    );
  typia.assert(region);

  // 4. Create a cancellation policy associated with the policy setting and region (business prerequisite)
  const cancellationPolicyCreate = {
    code: `CANCEL_${RandomGenerator.alphaNumeric(8)}`,
    name: "Default Cancel Policy",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 72,
    config_payload: JSON.stringify({ windowHours: 72 }),
    effective_from: new Date().toISOString(),
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

  // 5. Create a refund policy associated with same region and policy setting
  const refundPolicyCreate = {
    code: `REFUND_${RandomGenerator.alphaNumeric(8)}`,
    name: "Default Refund Policy",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    maxRefundRate: 1,
    requireManualApprovalOverAmount: 100000,
    configurationPayload: JSON.stringify({ maxRate: 1 }),
    isActive: true,
    effectiveFrom: new Date().toISOString(),
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

  // 6. Create a category tree (catalog prerequisite)
  const categoryTreeCreate = {
    code: `CAT_TREE_${RandomGenerator.alphaNumeric(6)}`,
    name: "Default Catalog Tree",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
    defaultLocale: "ko-KR",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeCreate },
    );
  typia.assert(categoryTree);

  // 7. Create a brand (will be associated with product)
  const brandCreate = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.example.com/logos/brand.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreate,
    });
  typia.assert(brand);

  // 8. Create a product with unique code, referencing the brand and a dummy seller id
  const productCode = `PROD_${RandomGenerator.alphaNumeric(10)}`;
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const productCreate = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Product ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: "https://cdn.example.com/products/product.png",
    additional_data: JSON.stringify({ categoryTreeId: categoryTree.id }),
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productCreate,
      },
    );
  typia.assert(product);

  TestValidator.equals(
    "created product code should match requested code",
    product.code,
    productCode,
  );

  // 9. Create a product visibility rule for the product, referencing region
  const startsAt = new Date().toISOString();
  const endsAt = null;

  const visibilityRuleCreate = {
    shopping_mall_region_setting_id: region.id,
    channel: "web",
    visibility: "visible",
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies IShoppingMallProductVisibilityRule.ICreate;

  const createdRule: IShoppingMallProductVisibilityRule =
    await api.functional.shoppingMall.platformAdmin.products.visibilityRules.create(
      connection,
      {
        productCode,
        body: visibilityRuleCreate,
      },
    );
  typia.assert(createdRule);

  TestValidator.equals(
    "created visibility rule should be linked to created product",
    createdRule.shopping_mall_product_id,
    product.id,
  );

  // 10. Retrieve the same visibility rule by productCode and rule id
  const fetchedRule: IShoppingMallProductVisibilityRule =
    await api.functional.shoppingMall.platformAdmin.products.visibilityRules.at(
      connection,
      {
        productCode,
        productVisibilityRuleId: createdRule.id,
      },
    );
  typia.assert(fetchedRule);

  // 11. Business-level validations on fetched rule
  TestValidator.equals(
    "fetched rule id should equal created rule id",
    fetchedRule.id,
    createdRule.id,
  );

  TestValidator.equals(
    "fetched rule product relation should match product",
    fetchedRule.shopping_mall_product_id,
    product.id,
  );

  TestValidator.equals(
    "fetched rule region id should equal created region id",
    fetchedRule.shopping_mall_region_setting_id,
    region.id,
  );

  if (fetchedRule.region !== undefined && fetchedRule.region !== null) {
    TestValidator.equals(
      "fetched rule region.code should equal created region code",
      fetchedRule.region.code,
      region.code,
    );

    TestValidator.equals(
      "fetched rule region.name should equal created region name",
      fetchedRule.region.name,
      region.name,
    );
  }

  TestValidator.equals(
    "fetched rule channel should equal created channel",
    fetchedRule.channel,
    visibilityRuleCreate.channel,
  );

  TestValidator.equals(
    "fetched rule visibility should equal created visibility",
    fetchedRule.visibility,
    visibilityRuleCreate.visibility,
  );

  TestValidator.equals(
    "fetched rule starts_at should equal created starts_at",
    fetchedRule.starts_at,
    visibilityRuleCreate.starts_at,
  );

  TestValidator.equals(
    "fetched rule ends_at should equal created ends_at",
    fetchedRule.ends_at,
    visibilityRuleCreate.ends_at,
  );

  // created_at and updated_at existence and format are covered by typia.assert,
  // so no additional explicit format checks are necessary here.
}
