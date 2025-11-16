import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRegionSetting";
import type { IShoppingMallCancellationPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationPolicy";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallRefundPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundPolicy";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";

/**
 * Validate advanced filtering, sorting, and pagination of region settings
 * search.
 *
 * Business flow:
 *
 * 1. Join a platform admin to obtain an authenticated connection.
 * 2. Seed at least one policy setting profile (for realistic configuration
 *    context).
 * 3. Seed multiple cancellation and refund policies referencing region/policy
 *    codes.
 * 4. Create at least four region settings with various combinations of:
 *
 *    - Iso_country_code: "US" or "KR"
 *    - Currency_code: "USD" or "KRW"
 *    - Timezone: "America/New_York" or "Asia/Seoul"
 *    - Active: true/false
 * 5. Call PATCH /shoppingMall/platformAdmin/regionSettings with filters
 *    isoCountryCode="US", currencyCode="USD", active=true and orderBy="code",
 *    orderDirection="asc".
 *
 *    - Assert that only active US/USD regions appear.
 *    - Assert ascending order by `code`.
 *    - Assert pagination metadata matches number of returned records.
 * 6. Call PATCH again with filters active=false and regionCodes listing some of
 *    the created region codes, orderDirection="desc".
 *
 *    - Assert that only the specified codes with active=false appear.
 *    - Assert descending order by `code`.
 *    - Assert pagination metadata consistency.
 */
export async function test_api_region_settings_search_filtering_and_sorting(
  connection: api.IConnection,
) {
  // 1. Join platform admin
  const joinRequest = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Seed a policy setting profile
  const policySettingCode = `policy_${RandomGenerator.alphaNumeric(6)}`;
  const policySettingCreate = {
    code: policySettingCode,
    name: `Policy ${RandomGenerator.name(1)}`,
    category: "cancellation",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
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

  // 3. Seed cancellation policies
  const regionCodeUs1 = "US_EAST";
  const regionCodeUs2 = "US_WEST";
  const regionCodeKr1 = "KR_SEOUL";
  const regionCodeKr2 = "KR_BUSAN";

  const cancellationCreates: IShoppingMallCancellationPolicy.ICreate[] = [
    {
      code: `cancel_${RandomGenerator.alphaNumeric(6)}`,
      name: "US East Cancel Policy",
      description: null,
      allow_cancellation_before_shipment: true,
      allow_partial_cancellation: true,
      max_hours_after_payment: 24,
      config_payload: null,
      effective_from: new Date().toISOString(),
      effective_to: null,
      active: true,
      region_code: regionCodeUs1,
      policy_setting_code: policySettingCode,
    },
    {
      code: `cancel_${RandomGenerator.alphaNumeric(6)}`,
      name: "US West Cancel Policy",
      description: null,
      allow_cancellation_before_shipment: true,
      allow_partial_cancellation: false,
      max_hours_after_payment: 12,
      config_payload: null,
      effective_from: new Date().toISOString(),
      effective_to: null,
      active: true,
      region_code: regionCodeUs2,
      policy_setting_code: policySettingCode,
    },
    {
      code: `cancel_${RandomGenerator.alphaNumeric(6)}`,
      name: "KR Cancel Policy",
      description: null,
      allow_cancellation_before_shipment: false,
      allow_partial_cancellation: true,
      max_hours_after_payment: null,
      config_payload: null,
      effective_from: null,
      effective_to: null,
      active: false,
      region_code: regionCodeKr1,
      policy_setting_code: policySettingCode,
    },
  ];

  const cancellationPolicies: IShoppingMallCancellationPolicy[] = [];
  for (const body of cancellationCreates) {
    const created =
      await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
        connection,
        { body },
      );
    typia.assert(created);
    cancellationPolicies.push(created);
  }

  // 4. Seed refund policies
  const refundCreates: IShoppingMallRefundPolicy.ICreate[] = [
    {
      code: `refund_${RandomGenerator.alphaNumeric(6)}`,
      name: "US Refund Policy",
      description: "US generic refund",
      allowFullRefund: true,
      allowPartialRefund: true,
      refundWindowDays: 30,
      maxRefundRate: 1,
      requireManualApprovalOverAmount: 300,
      configurationPayload: RandomGenerator.content({ paragraphs: 1 }),
      isActive: true,
      effectiveFrom: new Date().toISOString(),
      effectiveUntil: null,
      regionCode: regionCodeUs1,
      policySettingCode: policySettingCode,
    },
    {
      code: `refund_${RandomGenerator.alphaNumeric(6)}`,
      name: "KR Refund Policy",
      description: "KR generic refund",
      allowFullRefund: false,
      allowPartialRefund: true,
      refundWindowDays: 14,
      maxRefundRate: 0.5,
      requireManualApprovalOverAmount: 200,
      configurationPayload: RandomGenerator.content({ paragraphs: 1 }),
      isActive: true,
      effectiveFrom: new Date().toISOString(),
      effectiveUntil: null,
      regionCode: regionCodeKr1,
      policySettingCode: policySettingCode,
    },
  ];

  const refundPolicies: IShoppingMallRefundPolicy[] = [];
  for (const body of refundCreates) {
    const created =
      await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
        connection,
        { body },
      );
    typia.assert(created);
    refundPolicies.push(created);
  }

  // 5. Create diverse region settings
  const regionCreates: IShoppingMallRegionSetting.ICreate[] = [
    {
      code: regionCodeUs1,
      name: "US East",
      iso_country_code: "US",
      currency_code: "USD",
      timezone: "America/New_York",
      active: true,
    },
    {
      code: regionCodeUs2,
      name: "US West",
      iso_country_code: "US",
      currency_code: "USD",
      timezone: "America/New_York",
      active: false,
    },
    {
      code: regionCodeKr1,
      name: "KR Seoul",
      iso_country_code: "KR",
      currency_code: "KRW",
      timezone: "Asia/Seoul",
      active: true,
    },
    {
      code: regionCodeKr2,
      name: "KR Busan",
      iso_country_code: "KR",
      currency_code: "KRW",
      timezone: "Asia/Seoul",
      active: false,
    },
  ];

  const regions: IShoppingMallRegionSetting[] = [];
  for (const body of regionCreates) {
    const created =
      await api.functional.shoppingMall.platformAdmin.regionSettings.create(
        connection,
        { body },
      );
    typia.assert(created);
    regions.push(created);
  }

  // Helper to build expectation map by code
  const regionByCode = new Map<string, IShoppingMallRegionSetting>();
  for (const region of regions) regionByCode.set(region.code, region);

  // 6. First search: US + USD + active=true, order by code asc
  const searchBody1 = {
    page: 1,
    limit: 10,
    search: undefined,
    regionCodes: undefined,
    active: true,
    isoCountryCode: "US",
    currencyCode: "USD",
    timezone: undefined,
    orderBy: "code",
    orderDirection: "asc",
  } satisfies IShoppingMallRegionSetting.IRequest;

  const page1: IPageIShoppingMallRegionSetting.ISummary =
    await api.functional.shoppingMall.platformAdmin.regionSettings.index(
      connection,
      { body: searchBody1 },
    );
  typia.assert(page1);

  const pagination1 = page1.pagination;
  const data1 = page1.data;

  TestValidator.predicate(
    "US/USD/active=true filter - all records match filter",
    () =>
      data1.every((item) => {
        const full = regionByCode.get(item.code);
        return (
          full !== undefined &&
          full.iso_country_code === "US" &&
          full.currency_code === "USD" &&
          full.active === true
        );
      }),
  );

  // Ensure sort ascending by code
  const codes1 = data1.map((d) => d.code);
  const sortedAsc = [...codes1].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  TestValidator.equals(
    "US/USD/active=true results sorted ascending by code",
    codes1,
    sortedAsc,
  );

  // Pagination metadata consistency
  TestValidator.equals(
    "pagination.limit reflects requested limit",
    pagination1.limit,
    searchBody1.limit,
  );
  TestValidator.predicate(
    "pagination.records >= data length for first search",
    pagination1.records >= (data1.length as number),
  );
  TestValidator.predicate(
    "pagination.pages is at least 1 when there are records",
    () =>
      pagination1.records === 0
        ? pagination1.pages === 0
        : pagination1.pages >= 1,
  );

  // 7. Second search: active=false, specific regionCodes, order desc
  const inactiveCodes = [regionCodeUs2, regionCodeKr2];
  const searchBody2 = {
    page: 1,
    limit: 10,
    search: undefined,
    regionCodes: inactiveCodes,
    active: false,
    isoCountryCode: undefined,
    currencyCode: undefined,
    timezone: undefined,
    orderBy: "code",
    orderDirection: "desc",
  } satisfies IShoppingMallRegionSetting.IRequest;

  const page2: IPageIShoppingMallRegionSetting.ISummary =
    await api.functional.shoppingMall.platformAdmin.regionSettings.index(
      connection,
      { body: searchBody2 },
    );
  typia.assert(page2);

  const pagination2 = page2.pagination;
  const data2 = page2.data;

  // Ensure only specified codes and active=false
  const codeSet2 = new Set(inactiveCodes);
  TestValidator.predicate(
    "inactive regionCodes filter - all results are in requested set and inactive",
    () =>
      data2.every((item) => {
        const full = regionByCode.get(item.code);
        return (
          full !== undefined && codeSet2.has(item.code) && full.active === false
        );
      }),
  );

  // Ensure descending order by code
  const codes2 = data2.map((d) => d.code);
  const sortedDesc = [...codes2].sort((a, b) => (a > b ? -1 : a < b ? 1 : 0));
  TestValidator.equals(
    "inactive regionCodes results sorted descending by code",
    codes2,
    sortedDesc,
  );

  // Pagination metadata consistency
  TestValidator.equals(
    "second search pagination.limit reflects requested limit",
    pagination2.limit,
    searchBody2.limit,
  );
  TestValidator.predicate(
    "second search pagination.records >= data length",
    pagination2.records >= (data2.length as number),
  );
  TestValidator.predicate("second search pagination.pages is coherent", () =>
    pagination2.records === 0
      ? pagination2.pages === 0
      : pagination2.pages >= 1,
  );
}
