import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductComplianceFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductComplianceFlag";
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

export async function test_api_product_compliance_flags_search_when_no_flags_exist(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (auth + token wiring via SDK)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: undefined,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a region setting (can be reused by policies)
  const regionCreateBody = {
    code: `REG-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    iso_country_code: "KR",
    currency_code: "KRW",
    timezone: "Asia/Seoul",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const regionSetting: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionCreateBody },
    );
  typia.assert(regionSetting);

  // 3. Create a generic policy setting profile
  const policySettingBody = {
    code: `POLICY-${RandomGenerator.alphaNumeric(8)}`,
    name: "Global Compliance Policy",
    category: "compliance",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: null,
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policySettingBody },
    );
  typia.assert(policySetting);

  // 4. Optionally create cancellation, refund, and age restriction policies
  const cancellationPolicyBody = {
    code: `CANCEL-${RandomGenerator.alphaNumeric(8)}`,
    name: "Default Cancellation Policy",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 24 as number & tags.Type<"int32">,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    effective_from: null,
    effective_to: null,
    active: true,
    region_code: regionSetting.code,
    policy_setting_code: policySetting.code,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationPolicyBody },
    );
  typia.assert(cancellationPolicy);

  const refundPolicyBody = {
    code: `REFUND-${RandomGenerator.alphaNumeric(8)}`,
    name: "Default Refund Policy",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 14 as number & tags.Type<"int32"> & tags.Minimum<0>,
    maxRefundRate: 1.0,
    requireManualApprovalOverAmount: undefined,
    configurationPayload: RandomGenerator.content({ paragraphs: 1 }),
    isActive: true,
    effectiveFrom: null,
    effectiveUntil: null,
    regionCode: regionSetting.code,
    policySettingCode: policySetting.code,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundPolicyBody },
    );
  typia.assert(refundPolicy);

  const ageRestrictionPolicyBody = {
    code: `AGE-${RandomGenerator.alphaNumeric(8)}`,
    name: "Default Age Restriction Policy",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    minimum_age_years: 19 as number & tags.Type<"int32">,
    require_verified_age: false,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: null,
    effective_to: null,
    region_setting_id: regionSetting.id,
    policy_setting_id: null,
  } satisfies IShoppingMallAgeRestrictionPolicy.ICreate;

  const ageRestrictionPolicy: IShoppingMallAgeRestrictionPolicy =
    await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.create(
      connection,
      { body: ageRestrictionPolicyBody },
    );
  typia.assert(ageRestrictionPolicy);

  // 5. Create a category tree
  const categoryTreeBody = {
    code: `TREE-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog Tree",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    active: true,
    defaultLocale: "ko-KR",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert(categoryTree);

  // 6. Create a brand for the product
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(10)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.shoppingmall.test/logo.png" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 7. Create a product for some seller and the created brand, without any compliance flags
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const productCode: string & tags.MinLength<1> =
    `PROD-${RandomGenerator.alphaNumeric(10)}` as string & tags.MinLength<1>;

  const productCreateBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }) as string &
      tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri:
      "https://cdn.shoppingmall.test/product-main.png" as string &
        tags.Format<"uri">,
    additional_data: JSON.stringify({
      regionCode: regionSetting.code,
      cancellationPolicyCode: cancellationPolicy.code,
      refundPolicyCode: refundPolicy.code,
      ageRestrictionPolicyCode: ageRestrictionPolicy.code,
      categoryTreeCode: categoryTree.code,
    }),
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
    "created product code should match request",
    product.code,
    productCode,
  );

  // 8. Search compliance flags for the product with minimal filters
  const requestBody: IShoppingMallProductComplianceFlag.IRequest = {
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    flag_type: undefined,
    is_blocking_sale: undefined,
    created_from: undefined,
    created_to: undefined,
    order_by: undefined,
    order_direction: undefined,
  } satisfies IShoppingMallProductComplianceFlag.IRequest;

  const firstPage: IPageIShoppingMallProductComplianceFlag.ISummary =
    await api.functional.shoppingMall.platformAdmin.products.complianceFlags.index(
      connection,
      {
        productCode: product.code,
        body: requestBody,
      },
    );
  typia.assert(firstPage);

  // 9. Validate empty pagination and data
  const pagination1 = firstPage.pagination;
  typia.assert<IPage.IPagination>(pagination1);

  TestValidator.equals(
    "empty flags: records must be 0",
    pagination1.records,
    0,
  );
  TestValidator.equals("empty flags: pages must be 0", pagination1.pages, 0);
  TestValidator.equals(
    "empty flags: data length must be 0",
    firstPage.data.length,
    0,
  );

  // 10. Call the same search again to verify idempotent empty behavior
  const secondPage: IPageIShoppingMallProductComplianceFlag.ISummary =
    await api.functional.shoppingMall.platformAdmin.products.complianceFlags.index(
      connection,
      {
        productCode: product.code,
        body: requestBody,
      },
    );
  typia.assert(secondPage);

  const pagination2 = secondPage.pagination;
  typia.assert<IPage.IPagination>(pagination2);

  TestValidator.equals(
    "second call: records still 0",
    pagination2.records,
    pagination1.records,
  );
  TestValidator.equals(
    "second call: pages still 0",
    pagination2.pages,
    pagination1.pages,
  );
  TestValidator.equals(
    "second call: data length still 0",
    secondPage.data.length,
    firstPage.data.length,
  );

  TestValidator.equals(
    "second call: data arrays both empty",
    secondPage.data,
    firstPage.data,
  );
}
