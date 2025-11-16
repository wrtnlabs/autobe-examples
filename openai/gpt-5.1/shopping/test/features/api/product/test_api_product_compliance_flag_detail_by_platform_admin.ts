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

export async function test_api_product_compliance_flag_detail_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Join/register a platform admin so that subsequent calls run under platformAdmin context.
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.test.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://admin.test.com/join",
    referrer: "https://admin.test.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a policy setting profile used by cancellation/refund/age restriction policies.
  const policyCode = `policy_${RandomGenerator.alphaNumeric(8)}`;
  const policyBody = {
    code: policyCode,
    name: "Default Compliance Policy",
    category: "age_restriction",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: new Date().toISOString(),
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policyBody },
    );
  typia.assert(policySetting);

  // 3. Create a region setting that can be referenced by policies.
  const regionCode = `REGION_${RandomGenerator.alphaNumeric(5).toUpperCase()}`;
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

  // 4. Create a cancellation policy referencing region and policy setting codes.
  const cancellationCode = `cancel_${RandomGenerator.alphaNumeric(6)}`;
  const cancellationBody = {
    code: cancellationCode,
    name: "Standard Cancellation",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 24,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    effective_from: new Date().toISOString(),
    effective_to: null,
    active: true,
    region_code: region.code,
    policy_setting_code: policySetting.code,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationBody },
    );
  typia.assert(cancellationPolicy);

  // 5. Create a refund policy referencing region and policy setting.
  const refundCode = `refund_${RandomGenerator.alphaNumeric(6)}`;
  const refundBody = {
    code: refundCode,
    name: "Standard Refund",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 30,
    maxRefundRate: 1.0,
    requireManualApprovalOverAmount: 1000,
    configurationPayload: RandomGenerator.content({ paragraphs: 1 }),
    isActive: true,
    effectiveFrom: new Date().toISOString(),
    effectiveUntil: null,
    regionCode: region.code,
    policySettingCode: policySetting.code,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundBody },
    );
  typia.assert(refundPolicy);

  // 6. Create an age restriction policy tied to the region and policy setting.
  const agePolicyCode = `age_${RandomGenerator.alphaNumeric(6)}`;
  const ageRestrictionBody = {
    code: agePolicyCode,
    name: "18+ Only",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    minimum_age_years: 18,
    require_verified_age: true,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: new Date().toISOString(),
    effective_to: null,
    region_setting_id: region.id,
    policy_setting_id: policySetting.id,
  } satisfies IShoppingMallAgeRestrictionPolicy.ICreate;

  const agePolicy: IShoppingMallAgeRestrictionPolicy =
    await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.create(
      connection,
      { body: ageRestrictionBody },
    );
  typia.assert(agePolicy);

  // 7. Create a category tree (not strictly used by product DTO but part of scenario context).
  const categoryTreeCode = `tree_${RandomGenerator.alphaNumeric(6)}`;
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

  // 8. Create a brand to associate with the product.
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.test.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 9. Create a product associated with the created brand.
  const productCode = `prod_${RandomGenerator.alphaNumeric(10)}`;
  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Test Product ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: "https://cdn.test.com/product.png",
    additional_data: JSON.stringify({ categoryTreeId: categoryTree.id }),
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
    "product code should match requested code",
    product.code,
    productCode,
  );

  // 10. Create a compliance flag for this product referencing the age restriction policy.
  const flagBody = {
    shopping_mall_age_restriction_policy_id: agePolicy.id,
    flag_type: "age_restriction",
    flag_value: "18+",
    is_blocking_sale: true,
    notes: "Restricted to adults only",
  } satisfies IShoppingMallProductComplianceFlag.ICreate;

  const createdFlag: IShoppingMallProductComplianceFlag =
    await api.functional.shoppingMall.platformAdmin.products.complianceFlags.create(
      connection,
      {
        productCode: product.code,
        body: flagBody,
      },
    );
  typia.assert(createdFlag);

  // Basic invariants on creation result
  TestValidator.equals(
    "created flag type should match request",
    createdFlag.flag_type,
    flagBody.flag_type,
  );
  TestValidator.equals(
    "created flag_value should match request",
    createdFlag.flag_value,
    flagBody.flag_value,
  );
  TestValidator.equals(
    "created notes should match request",
    createdFlag.notes,
    flagBody.notes,
  );
  TestValidator.equals(
    "created is_blocking_sale should be true",
    createdFlag.is_blocking_sale,
    true,
  );
  TestValidator.equals(
    "created flag should reference age restriction policy id",
    createdFlag.shopping_mall_age_restriction_policy_id,
    agePolicy.id,
  );

  // 11. Retrieve the compliance flag by productCode and productComplianceFlagId.
  const fetchedFlag: IShoppingMallProductComplianceFlag =
    await api.functional.shoppingMall.platformAdmin.products.complianceFlags.at(
      connection,
      {
        productCode: product.code,
        productComplianceFlagId: createdFlag.id,
      },
    );
  typia.assert(fetchedFlag);

  // 12. Validate that fetched flag matches created flag fields.
  TestValidator.equals(
    "fetched flag id should equal created flag id",
    fetchedFlag.id,
    createdFlag.id,
  );
  TestValidator.equals(
    "fetched flag type should equal created flag type",
    fetchedFlag.flag_type,
    createdFlag.flag_type,
  );
  TestValidator.equals(
    "fetched flag_value should equal created flag_value",
    fetchedFlag.flag_value,
    createdFlag.flag_value,
  );
  TestValidator.equals(
    "fetched notes should equal created notes",
    fetchedFlag.notes,
    createdFlag.notes,
  );
  TestValidator.equals(
    "fetched is_blocking_sale should equal created is_blocking_sale",
    fetchedFlag.is_blocking_sale,
    createdFlag.is_blocking_sale,
  );
  TestValidator.equals(
    "fetched flag should reference same age restriction policy",
    fetchedFlag.shopping_mall_age_restriction_policy_id,
    createdFlag.shopping_mall_age_restriction_policy_id,
  );

  // Audit timestamps should be consistent (we only assert they are present via typia.assert).
  TestValidator.predicate(
    "created_at should be non-empty string",
    fetchedFlag.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be non-empty string",
    fetchedFlag.updated_at.length > 0,
  );
}
