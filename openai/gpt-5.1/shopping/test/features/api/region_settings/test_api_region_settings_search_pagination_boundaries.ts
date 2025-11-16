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

export async function test_api_region_settings_search_pagination_boundaries(
  connection: api.IConnection,
) {
  // 1. Register platform admin to obtain authorization context
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Create minimal policy setting (used by cancellation/refund policies)
  const policyCode = `POLICY_${RandomGenerator.alphaNumeric(8)}`;
  const policyCreateBody = {
    code: policyCode,
    name: "Default Policy Setting",
    category: "generic",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    config_payload: null,
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

  // 3. Create an active cancellation policy associated with the policy setting
  const cancellationCode = `CANCEL_${RandomGenerator.alphaNumeric(8)}`;
  const cancellationCreateBody = {
    code: cancellationCode,
    name: "Default Cancellation Policy",
    description: null,
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 24,
    config_payload: null,
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

  // 4. Create an active refund policy associated with the policy setting
  const refundCode = `REFUND_${RandomGenerator.alphaNumeric(8)}`;
  const refundCreateBody = {
    code: refundCode,
    name: "Default Refund Policy",
    description: "Default refund rules",
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 30,
    maxRefundRate: 1.0,
    requireManualApprovalOverAmount: undefined,
    configurationPayload: undefined,
    isActive: true,
    effectiveFrom: null,
    effectiveUntil: null,
    regionCode: null,
    policySettingCode: policyCode,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundCreateBody },
    );
  typia.assert(refundPolicy);

  // 5. Bulk create 25 region settings with deterministic codes REGION_001..REGION_025
  const totalRegions = 25;
  const regionSettings: IShoppingMallRegionSetting[] = [];

  for (let i = 1; i <= totalRegions; i++) {
    const indexStr = i.toString().padStart(3, "0");
    const code = `REGION_${indexStr}`;
    const body = {
      code,
      name: `Region ${indexStr}`,
      iso_country_code: null,
      currency_code: null,
      timezone: null,
      active: true,
    } satisfies IShoppingMallRegionSetting.ICreate;

    const created: IShoppingMallRegionSetting =
      await api.functional.shoppingMall.platformAdmin.regionSettings.create(
        connection,
        { body },
      );
    typia.assert(created);
    regionSettings.push(created);
  }

  // Helper to derive expected codes for a page
  const getExpectedCodes = (page: number, limit: number): string[] => {
    const startIndex = (page - 1) * limit; // 1-based page
    const endIndex = Math.min(startIndex + limit, totalRegions);
    const codes: string[] = [];
    for (let i = startIndex; i < endIndex; i++) {
      const indexStr = (i + 1).toString().padStart(3, "0");
      codes.push(`REGION_${indexStr}`);
    }
    return codes;
  };

  // 6. Page 1, limit 10
  const page1 = 1;
  const limit10 = 10;

  const page1Response: IPageIShoppingMallRegionSetting.ISummary =
    await api.functional.shoppingMall.platformAdmin.regionSettings.index(
      connection,
      {
        body: {
          page: page1,
          limit: limit10,
          search: undefined,
          regionCodes: undefined,
          active: true,
          isoCountryCode: undefined,
          currencyCode: undefined,
          timezone: undefined,
          orderBy: "code",
          orderDirection: "asc",
        },
      },
    );
  typia.assert(page1Response);

  const p1 = page1Response.pagination;
  TestValidator.equals("page1: current index", p1.current, page1 - 1);
  TestValidator.equals("page1: limit", p1.limit, limit10);
  TestValidator.predicate(
    "page1: records >= totalRegions",
    () => p1.records >= totalRegions,
  );
  TestValidator.predicate("page1: pages >= 3", () => p1.pages >= 3);
  TestValidator.equals(
    "page1: data length",
    page1Response.data.length,
    Math.min(limit10, totalRegions),
  );

  const expectedPage1Codes = getExpectedCodes(page1, limit10);
  const actualPage1Codes = page1Response.data.map((s) => s.code);
  TestValidator.equals(
    "page1: codes match",
    actualPage1Codes,
    expectedPage1Codes,
  );

  // 7. Page 3, limit 10 (tail page)
  const page3 = 3;
  const page3Response: IPageIShoppingMallRegionSetting.ISummary =
    await api.functional.shoppingMall.platformAdmin.regionSettings.index(
      connection,
      {
        body: {
          page: page3,
          limit: limit10,
          search: undefined,
          regionCodes: undefined,
          active: true,
          isoCountryCode: undefined,
          currencyCode: undefined,
          timezone: undefined,
          orderBy: "code",
          orderDirection: "asc",
        },
      },
    );
  typia.assert(page3Response);

  const p3 = page3Response.pagination;
  TestValidator.equals("page3: current index", p3.current, page3 - 1);
  TestValidator.equals("page3: limit", p3.limit, limit10);
  TestValidator.equals("page3: same records as page1", p3.records, p1.records);
  TestValidator.equals("page3: same pages as page1", p3.pages, p1.pages);

  const expectedPage3Codes = getExpectedCodes(page3, limit10);
  const actualPage3Codes = page3Response.data.map((s) => s.code);
  TestValidator.equals(
    "page3: data length",
    actualPage3Codes.length,
    expectedPage3Codes.length,
  );
  TestValidator.equals(
    "page3: codes match tail",
    actualPage3Codes,
    expectedPage3Codes,
  );

  // 8. Page beyond last (e.g., page 10, limit 10)
  const pageBeyond = 10;
  const beyondResponse: IPageIShoppingMallRegionSetting.ISummary =
    await api.functional.shoppingMall.platformAdmin.regionSettings.index(
      connection,
      {
        body: {
          page: pageBeyond,
          limit: limit10,
          search: undefined,
          regionCodes: undefined,
          active: true,
          isoCountryCode: undefined,
          currencyCode: undefined,
          timezone: undefined,
          orderBy: "code",
          orderDirection: "asc",
        },
      },
    );
  typia.assert(beyondResponse);

  const pb = beyondResponse.pagination;
  TestValidator.equals("beyond: records stable", pb.records, p1.records);
  TestValidator.equals("beyond: pages stable", pb.pages, p1.pages);
  TestValidator.equals("beyond: empty data", beyondResponse.data.length, 0);

  // 9. Change limit to 7 and verify pagination recalculates while records stay
  const limit7 = 7;
  const page1Limit7 = 1;

  const page1Limit7Response: IPageIShoppingMallRegionSetting.ISummary =
    await api.functional.shoppingMall.platformAdmin.regionSettings.index(
      connection,
      {
        body: {
          page: page1Limit7,
          limit: limit7,
          search: undefined,
          regionCodes: undefined,
          active: true,
          isoCountryCode: undefined,
          currencyCode: undefined,
          timezone: undefined,
          orderBy: "code",
          orderDirection: "asc",
        },
      },
    );
  typia.assert(page1Limit7Response);

  const p1l7 = page1Limit7Response.pagination;
  TestValidator.equals(
    "limit7 p1: current index",
    p1l7.current,
    page1Limit7 - 1,
  );
  TestValidator.equals("limit7 p1: limit", p1l7.limit, limit7);
  TestValidator.equals(
    "limit7 p1: records same as limit10",
    p1l7.records,
    p1.records,
  );
  TestValidator.predicate(
    "limit7 p1: pages > pages with limit10",
    () => p1l7.pages >= Math.ceil(p1.records / limit7),
  );
  TestValidator.equals(
    "limit7 p1: data length",
    page1Limit7Response.data.length,
    Math.min(limit7, totalRegions),
  );

  const expectedPage1Limit7Codes = getExpectedCodes(page1Limit7, limit7);
  const actualPage1Limit7Codes = page1Limit7Response.data.map((s) => s.code);
  TestValidator.equals(
    "limit7 p1: codes match",
    actualPage1Limit7Codes,
    expectedPage1Limit7Codes,
  );

  // Another page with limit 7 (e.g., page 3)
  const page3Limit7 = 3;
  const page3Limit7Response: IPageIShoppingMallRegionSetting.ISummary =
    await api.functional.shoppingMall.platformAdmin.regionSettings.index(
      connection,
      {
        body: {
          page: page3Limit7,
          limit: limit7,
          search: undefined,
          regionCodes: undefined,
          active: true,
          isoCountryCode: undefined,
          currencyCode: undefined,
          timezone: undefined,
          orderBy: "code",
          orderDirection: "asc",
        },
      },
    );
  typia.assert(page3Limit7Response);

  const p3l7 = page3Limit7Response.pagination;
  TestValidator.equals(
    "limit7 p3: current index",
    p3l7.current,
    page3Limit7 - 1,
  );
  TestValidator.equals("limit7 p3: limit", p3l7.limit, limit7);
  TestValidator.equals("limit7 p3: records stable", p3l7.records, p1.records);

  const expectedPage3Limit7Codes = getExpectedCodes(page3Limit7, limit7);
  const actualPage3Limit7Codes = page3Limit7Response.data.map((s) => s.code);
  TestValidator.equals(
    "limit7 p3: data length",
    actualPage3Limit7Codes.length,
    expectedPage3Limit7Codes.length,
  );
  TestValidator.equals(
    "limit7 p3: codes match",
    actualPage3Limit7Codes,
    expectedPage3Limit7Codes,
  );
}
