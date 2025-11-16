import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCancellationPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationPolicy";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallRefundPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundPolicy";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

export async function test_api_product_search_by_keyword_and_filters(
  connection: api.IConnection,
) {
  // 1. Platform admin onboarding: join
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const platformAdminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminJoin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminJoin);

  // 1-2. Platform admin login to ensure token handling works
  const platformAdminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // 2. Policy setting profile creation
  const policyCode: string = `policy-${RandomGenerator.alphaNumeric(8)}`;
  const policyCreateBody = {
    code: policyCode,
    name: "Default Refund Profile",
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    config_payload: JSON.stringify({
      kind: "refund_default",
    }),
    active: true,
    effective_from: null,
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policyCreateBody },
    );
  typia.assert(policySetting);

  // 2-2. Cancellation policy (not directly used in filters but part of setup)
  const cancellationCode: string = `cancel-${RandomGenerator.alphaNumeric(8)}`;
  const cancellationCreateBody = {
    code: cancellationCode,
    name: "Default Cancellation Policy",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 48,
    config_payload: JSON.stringify({
      windowHours: 48,
    }),
    effective_from: null,
    effective_to: null,
    active: true,
    region_code: null,
    policy_setting_code: policyCode,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationCreateBody },
    );
  typia.assert(cancellationPolicy);

  // 2-3. Refund policy referencing policy setting and region (region code later)
  const regionBusinessCode: string = `REGION-${RandomGenerator.alphaNumeric(6)}`;
  const refundPolicyCode: string = `refund-${RandomGenerator.alphaNumeric(8)}`;

  const now = new Date();
  const effectiveFromIso = now.toISOString();
  const effectiveUntilIso = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const refundCreateBodyWithoutRegion = {
    code: refundPolicyCode,
    name: "Default Refund Policy",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 14,
    maxRefundRate: 1,
    requireManualApprovalOverAmount: 100000,
    configurationPayload: JSON.stringify({
      strategy: "standard",
    }),
    isActive: true,
    effectiveFrom: effectiveFromIso,
    effectiveUntil: effectiveUntilIso,
    regionCode: null,
    policySettingCode: policyCode,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundCreateBodyWithoutRegion },
    );
  typia.assert(refundPolicy);

  // 3. Region and brand setup
  const regionCreateBody = {
    code: regionBusinessCode,
    name: "Test Region",
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

  const brandName = `KeywordBrand ${RandomGenerator.name(1)}`;
  const brandSlug = `keyword-brand-${RandomGenerator.alphaNumeric(6)}`;
  const brandCreateBody = {
    name: brandName,
    slug: brandSlug,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 4. Seller onboarding
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword: string = RandomGenerator.alphaNumeric(12);

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 4-2. Seller creates primary product with searchable keyword
  const searchKeyword = "SearchKeyword";
  const sellerProductCode: string = `SP-${RandomGenerator.alphaNumeric(10)}`;
  const sellerProductCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: sellerProductCode as string & tags.MinLength<1>,
    name: `${searchKeyword} Alpha` as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri: "https://cdn.example.com/product-main.png",
    additional_data: JSON.stringify({
      originRegionCode: regionBusinessCode,
    }),
  } satisfies IShoppingMallProduct.ICreate;

  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerProductCreateBody,
    });
  typia.assert(sellerProduct);

  // 5. Admin-created product for negative filter scenario
  const platformAdminLoginAgain: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAgain);

  const otherProductCode: string = `OP-${RandomGenerator.alphaNumeric(10)}`;
  const otherProductCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: null,
    code: otherProductCode as string & tags.MinLength<1>,
    name: "Other Product Without Keyword" as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "inactive" as string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri: "https://cdn.example.com/other-product.png",
    additional_data: JSON.stringify({
      originRegionCode: regionBusinessCode,
    }),
  } satisfies IShoppingMallProduct.ICreate;

  const otherProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: otherProductCreateBody,
      },
    );
  typia.assert(otherProduct);

  // 6. Anonymous search
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  const pageSize: number & tags.Type<"int32"> & tags.Minimum<1> = 10;

  const searchRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    page_size: pageSize,
    sort_field: "created_at",
    sort_direction: "desc" as const,
    keyword: searchKeyword,
    status: sellerProduct.status,
    seller_id: undefined,
    brand_id: brand.id,
    category_ids: undefined,
    region_setting_id: regionSetting.id,
    channel: undefined,
    min_price: undefined,
    max_price: undefined,
    in_stock_only: undefined,
    compliance_flag_types: undefined,
  } satisfies IShoppingMallProduct.IRequest;

  const pageResult: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.products.index(unauthConnection, {
      body: searchRequestBody,
    });
  typia.assert(pageResult);

  // 7. Response & business validations
  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert(pagination);

  TestValidator.predicate(
    "search pagination records should be at least 1",
    pagination.records >= 1,
  );

  TestValidator.predicate(
    "search pagination current should be non-negative",
    pagination.current >= 0,
  );

  TestValidator.predicate(
    "search pagination pages should be >= 1 when records > 0",
    pagination.records === 0 || pagination.pages >= 1,
  );

  TestValidator.predicate(
    "search data length should be >= 1",
    pageResult.data.length >= 1,
  );

  const containsSellerProduct = pageResult.data.some(
    (summary) => summary.id === sellerProduct.id,
  );

  TestValidator.predicate(
    "search result should include seller's keyword product",
    containsSellerProduct,
  );

  const allMatchBrandFilter = pageResult.data.every((summary) => {
    if (!summary.brand) return false;
    return summary.brand.id === brand.id;
  });

  TestValidator.predicate(
    "all returned products should match requested brand filter",
    allMatchBrandFilter,
  );

  const containsOtherProduct = pageResult.data.some(
    (summary) => summary.id === otherProduct.id,
  );

  TestValidator.predicate(
    "search result should not contain product that does not match brand or status filters",
    containsOtherProduct === false,
  );

  // 8. Negative keyword filter scenario
  const negativeSearchRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    page_size: pageSize,
    sort_field: "created_at",
    sort_direction: "desc" as const,
    keyword: "NonExistingKeyword",
    status: sellerProduct.status,
    seller_id: undefined,
    brand_id: brand.id,
    category_ids: undefined,
    region_setting_id: regionSetting.id,
    channel: undefined,
    min_price: undefined,
    max_price: undefined,
    in_stock_only: undefined,
    compliance_flag_types: undefined,
  } satisfies IShoppingMallProduct.IRequest;

  const negativePageResult: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.products.index(unauthConnection, {
      body: negativeSearchRequestBody,
    });
  typia.assert(negativePageResult);

  TestValidator.equals(
    "negative keyword search should have zero records",
    negativePageResult.pagination.records,
    0,
  );

  TestValidator.equals(
    "negative keyword search should return empty data array",
    negativePageResult.data.length,
    0,
  );
}
