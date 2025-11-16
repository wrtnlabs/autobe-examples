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

export async function test_api_region_settings_search_inactive_and_mixed_status_regions(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin (join) so that subsequent calls are authorized
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
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

  // 2. Create a policy setting profile
  const policySettingBody = {
    code: `policy_${RandomGenerator.alphaNumeric(8)}`,
    name: "Default Cancellation/Refund Profile",
    category: "cancellation_refund",
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

  // 3. Create a cancellation policy referencing the policy setting by code
  const cancellationPolicyBody = {
    code: `cancel_${RandomGenerator.alphaNumeric(8)}`,
    name: "Global Cancellation Policy",
    description: RandomGenerator.paragraph({ sentences: 5 }),
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

  // 4. Create a refund policy referencing the same policy setting by code
  const refundPolicyBody = {
    code: `refund_${RandomGenerator.alphaNumeric(8)}`,
    name: "Global Refund Policy",
    description: RandomGenerator.paragraph({ sentences: 5 }),
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

  // 5. Seed several region settings: mix active true/false and varied country/currency
  const regionDefinitions: Array<{
    code: string;
    name: string;
    iso_country_code: string | null;
    currency_code: string | null;
    timezone: string | null;
    active: boolean;
  }> = [
    {
      code: `US_${RandomGenerator.alphaNumeric(4)}`,
      name: "United States Active",
      iso_country_code: "US",
      currency_code: "USD",
      timezone: "America/New_York",
      active: true,
    },
    {
      code: `US_INACTIVE_${RandomGenerator.alphaNumeric(4)}`,
      name: "United States Inactive",
      iso_country_code: "US",
      currency_code: "USD",
      timezone: "America/Los_Angeles",
      active: false,
    },
    {
      code: `KR_${RandomGenerator.alphaNumeric(4)}`,
      name: "Korea Active",
      iso_country_code: "KR",
      currency_code: "KRW",
      timezone: "Asia/Seoul",
      active: true,
    },
    {
      code: `EU_${RandomGenerator.alphaNumeric(4)}`,
      name: "Europe Inactive",
      iso_country_code: null,
      currency_code: "EUR",
      timezone: "Europe/Berlin",
      active: false,
    },
  ];

  const createdRegions: IShoppingMallRegionSetting[] = [];
  for (const def of regionDefinitions) {
    const body = {
      code: def.code,
      name: def.name,
      iso_country_code: def.iso_country_code,
      currency_code: def.currency_code,
      timezone: def.timezone,
      active: def.active,
    } satisfies IShoppingMallRegionSetting.ICreate;

    const region: IShoppingMallRegionSetting =
      await api.functional.shoppingMall.platformAdmin.regionSettings.create(
        connection,
        { body },
      );
    typia.assert(region);
    createdRegions.push(region);
  }

  // Precompute lists of codes by active flag for later assertions
  const activeCodes = createdRegions.filter((r) => r.active).map((r) => r.code);
  const inactiveCodes = createdRegions
    .filter((r) => !r.active)
    .map((r) => r.code);
  const allCodes = createdRegions.map((r) => r.code);

  // Sanity: ensure we actually have both active and inactive regions
  TestValidator.predicate(
    "seeded regions include at least one active and one inactive",
    activeCodes.length > 0 && inactiveCodes.length > 0,
  );

  // Helper to assert pagination meta is consistent with data length
  const assertPagination = (
    title: string,
    page: IPage.IPagination,
    dataLength: number,
  ): void => {
    TestValidator.predicate(
      `${title}: records non-negative`,
      page.records >= 0,
    );
    TestValidator.predicate(`${title}: limit positive`, page.limit > 0);
    TestValidator.predicate(`${title}: pages non-negative`, page.pages >= 0);
    TestValidator.predicate(
      `${title}: data length does not exceed limit`,
      dataLength <= page.limit,
    );
  };

  // 6. Query with active=true filter
  const activeSearchBody = {
    page: 1,
    limit: 20,
    active: true,
  } satisfies IShoppingMallRegionSetting.IRequest;

  const activePage: IPageIShoppingMallRegionSetting.ISummary =
    await api.functional.shoppingMall.platformAdmin.regionSettings.index(
      connection,
      { body: activeSearchBody },
    );
  typia.assert(activePage);

  assertPagination(
    "active regions search",
    activePage.pagination,
    activePage.data.length,
  );

  TestValidator.predicate(
    "active search returns at least one region",
    activePage.data.length > 0,
  );

  // Every returned region must be active
  for (const summary of activePage.data) {
    TestValidator.predicate(
      "each region in active search has active=true",
      summary.active === true,
    );
    TestValidator.predicate(
      "each returned active code is one of created active codes",
      activeCodes.includes(summary.code),
    );
  }

  // 7. Query with active=false filter
  const inactiveSearchBody = {
    page: 1,
    limit: 20,
    active: false,
  } satisfies IShoppingMallRegionSetting.IRequest;

  const inactivePage: IPageIShoppingMallRegionSetting.ISummary =
    await api.functional.shoppingMall.platformAdmin.regionSettings.index(
      connection,
      { body: inactiveSearchBody },
    );
  typia.assert(inactivePage);

  assertPagination(
    "inactive regions search",
    inactivePage.pagination,
    inactivePage.data.length,
  );

  TestValidator.predicate(
    "inactive search returns at least one region",
    inactivePage.data.length > 0,
  );

  for (const summary of inactivePage.data) {
    TestValidator.predicate(
      "each region in inactive search has active=false",
      summary.active === false,
    );
    TestValidator.predicate(
      "each returned inactive code is one of created inactive codes",
      inactiveCodes.includes(summary.code),
    );
  }

  // 8. Query without active filter, but restrict regionCodes to seeded ones
  const mixedSearchBody = {
    page: 1,
    limit: 20,
    regionCodes: allCodes,
  } satisfies IShoppingMallRegionSetting.IRequest;

  const mixedPage: IPageIShoppingMallRegionSetting.ISummary =
    await api.functional.shoppingMall.platformAdmin.regionSettings.index(
      connection,
      { body: mixedSearchBody },
    );
  typia.assert(mixedPage);

  assertPagination(
    "mixed regions search without active filter",
    mixedPage.pagination,
    mixedPage.data.length,
  );

  // Confirm that all returned regions are within the seeded set
  for (const summary of mixedPage.data) {
    TestValidator.predicate(
      "mixed search returns only seeded codes",
      allCodes.includes(summary.code),
    );
  }

  // Check that we see both active and inactive in the mixed result,
  // demonstrating that `active` filter is optional and not applied when omitted.
  const mixedActiveCount = mixedPage.data.filter((s) => s.active).length;
  const mixedInactiveCount = mixedPage.data.filter((s) => !s.active).length;

  TestValidator.predicate(
    "mixed search without active filter includes at least one active region",
    mixedActiveCount > 0,
  );
  TestValidator.predicate(
    "mixed search without active filter includes at least one inactive region",
    mixedInactiveCount > 0,
  );
}
