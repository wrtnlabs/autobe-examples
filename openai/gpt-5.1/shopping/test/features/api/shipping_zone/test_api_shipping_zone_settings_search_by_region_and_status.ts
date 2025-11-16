import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShippingZoneSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShippingZoneSetting";
import type { IShoppingMallCancellationPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationPolicy";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallRefundPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundPolicy";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";
import type { IShoppingMallShippingZoneSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingZoneSetting";

/**
 * Validate searching shipping zone settings by region and active status.
 *
 * Business goal: Ensure a platform administrator can filter and paginate
 * shipping zone configuration records by `regionCode` and `active` flag via
 * PATCH /shoppingMall/platformAdmin/shippingZoneSettings, and that the response
 * contains only matching summaries with correct pagination metadata.
 *
 * High-level flow:
 *
 * 1. Register a platform admin (join) so that subsequent platformAdmin endpoints
 *    are authorized.
 * 2. Create a policy setting profile (for environmental realism) but do not rely
 *    on it functionally in this test.
 * 3. Create a cancellation policy and refund policy; associate them loosely via
 *    codes and region/policy links only to simulate a realistic configuration
 *    graph (no direct dependency in assertions).
 * 4. Create a region setting with a stable business code (e.g. "EU_ZONE_TEST")
 *    that will serve as the filter `regionCode` and as the primary region for
 *    some shipping zone settings.
 * 5. Create several shipping zone settings:
 *
 *    - A set of active zones tied to the created region.
 *    - Additional zones that are either inactive or tied to other regions (or have
 *         no primary region), to act as negative cases.
 * 6. Call PATCH /shoppingMall/platformAdmin/shippingZoneSettings with an
 *    IShoppingMallShippingZoneSetting.IRequest body that sets:
 *
 *    - Page = 1 (first page),
 *    - PageSize large enough to include all matches in a single page,
 *    - RegionCode = created region.code,
 *    - Active = true,
 *    - SortBy = "code", sortDirection = "asc".
 * 7. Verify that the response (IPageIShoppingMallShippingZoneSetting.ISummary):
 *
 *    - Has pagination.metadata where `pagination.records` equals the number of
 *         active zones created for that region and `pagination.pages` is 1 when
 *         records > 0.
 *    - Has a `data` array whose length equals that same count.
 *    - Each entry in `data` has `active === true` and `region.code === region.code`
 *         and `region.active === region.active`.
 *    - All created matching codes appear, and no non-matching zones appear.
 * 8. Perform a second search that should yield an empty dataset, for example:
 *
 *    - Using a non-existent regionCode, or
 *    - Using active = false when all created zones for that region are active. This
 *         test will use a non-existent regionCode to avoid conflicting with the
 *         first search.
 * 9. Verify that the second response has:
 *
 *    - Pagination.records === 0 and pagination.pages === 0,
 *    - Data.length === 0.
 */
export async function test_api_shipping_zone_settings_search_by_region_and_status(
  connection: api.IConnection,
) {
  // 1. Register a platform admin via join
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin.example.com/join", // valid URI format
    referrer: "https://admin.example.com/ref", // valid URI format
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a policy setting profile for realism only
  const policySettingBody = {
    code: `POLICY_${RandomGenerator.alphaNumeric(6)}`,
    name: "Default Cancellation Policy Profile",
    category: "cancellation",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    config_payload: RandomGenerator.paragraph({ sentences: 6 }),
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

  // 3. Create a cancellation policy, associated to the region/policy by code later
  const cancellationPolicyBody = {
    code: `CANCEL_${RandomGenerator.alphaNumeric(6)}`,
    name: "Standard Cancellation Policy",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 24,
    config_payload: RandomGenerator.paragraph({ sentences: 5 }),
    effective_from: new Date().toISOString(),
    effective_to: null,
    active: true,
    // region_code and policy_setting_code will be attached using
    // the region and policy created in this test
    region_code: null,
    policy_setting_code: policySetting.code,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationPolicyBody },
    );
  typia.assert(cancellationPolicy);

  // 4. Create a region setting used for shipping zones and refund policy
  const regionCode = `EU_ZONE_${RandomGenerator.alphaNumeric(4)}`;
  const regionBody = {
    code: regionCode,
    name: "EU Zone Test Region",
    iso_country_code: "EU",
    currency_code: "EUR",
    timezone: "Europe/Berlin",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionBody },
    );
  typia.assert(region);

  // 5. Create a refund policy scoped to the region and policy setting
  const refundPolicyBody = {
    code: `REFUND_${RandomGenerator.alphaNumeric(6)}`,
    name: "Standard Refund Policy",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 30,
    maxRefundRate: 1.0,
    requireManualApprovalOverAmount: 1000,
    configurationPayload: RandomGenerator.paragraph({ sentences: 4 }),
    isActive: true,
    effectiveFrom: new Date().toISOString(),
    effectiveUntil: null,
    regionCode: region.code,
    policySettingCode: policySetting.code,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundPolicyBody },
    );
  typia.assert(refundPolicy);

  // 6. Create a few additional regions for negative shipping zone cases
  const otherRegionBody = {
    code: `OTHER_${RandomGenerator.alphaNumeric(4)}`,
    name: "Other Test Region",
    iso_country_code: "OT",
    currency_code: "USD",
    timezone: "UTC",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const otherRegion: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: otherRegionBody },
    );
  typia.assert(otherRegion);

  // 7. Create several shipping zones:
  //    - active zones tied to the main region
  //    - inactive zones or zones tied to otherRegion or no region
  const shippingZones: IShoppingMallShippingZoneSetting[] = [];

  const createZone = async (
    code: string,
    name: string,
    active: boolean,
    regionId: string | null,
  ): Promise<IShoppingMallShippingZoneSetting> => {
    const body = {
      code,
      name,
      description: RandomGenerator.paragraph({ sentences: 2 }),
      active,
      shopping_mall_region_setting_id: regionId,
    } satisfies IShoppingMallShippingZoneSetting.ICreate;

    const zone: IShoppingMallShippingZoneSetting =
      await api.functional.shoppingMall.platformAdmin.shippingZoneSettings.create(
        connection,
        { body },
      );
    typia.assert(zone);
    shippingZones.push(zone);
    return zone;
  };

  // Active zones for the main region
  const mainActiveZone1 = await createZone(
    `EU_ACTIVE_${RandomGenerator.alphaNumeric(4)}`,
    "EU Active Zone 1",
    true,
    region.id,
  );
  const mainActiveZone2 = await createZone(
    `EU_ACTIVE_${RandomGenerator.alphaNumeric(4)}`,
    "EU Active Zone 2",
    true,
    region.id,
  );

  // Inactive zone for the main region (negative example for `active: true`)
  await createZone(
    `EU_INACTIVE_${RandomGenerator.alphaNumeric(4)}`,
    "EU Inactive Zone",
    false,
    region.id,
  );

  // Active zone tied to a different region
  await createZone(
    `OTHER_ACTIVE_${RandomGenerator.alphaNumeric(4)}`,
    "Other Region Active Zone",
    true,
    otherRegion.id,
  );

  // Active zone with no primary region
  await createZone(
    `GLOBAL_ACTIVE_${RandomGenerator.alphaNumeric(4)}`,
    "Global Active Zone",
    true,
    null,
  );

  // Filter out the zones that should match the first search
  const expectedActiveMainRegionZones = shippingZones.filter((z) => {
    const regionSummary = z.primaryRegion;
    return (
      z.active === true &&
      regionSummary !== undefined &&
      regionSummary.code === region.code
    );
  });

  // Sanity assertion: we expect at least two matching zones
  TestValidator.predicate(
    "should have at least two active zones for main region",
    expectedActiveMainRegionZones.length >= 2,
  );

  // 8. First search: active=true, regionCode = main region, sorted by code asc
  const pageSize = 20 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const requestBody1 = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize,
    search: undefined,
    code: undefined,
    name: undefined,
    active: true,
    regionCode: region.code,
    sortBy: "code" as const,
    sortDirection: "asc" as const,
  } satisfies IShoppingMallShippingZoneSetting.IRequest;

  const page1: IPageIShoppingMallShippingZoneSetting.ISummary =
    await api.functional.shoppingMall.platformAdmin.shippingZoneSettings.index(
      connection,
      { body: requestBody1 },
    );
  typia.assert(page1);

  // Validate pagination metadata
  const pagination1 = page1.pagination;
  typia.assert<IPage.IPagination>(pagination1);

  TestValidator.equals(
    "records should equal number of expected active main-region zones",
    pagination1.records,
    expectedActiveMainRegionZones.length,
  );

  TestValidator.predicate(
    "pages should be 1 when records > 0",
    pagination1.records === 0
      ? pagination1.pages === 0
      : pagination1.pages === 1,
  );

  TestValidator.predicate(
    "limit (page size) should be >= number of records when we request large pageSize",
    pagination1.limit >= pagination1.records,
  );

  // Validate content of data array
  const data1 = page1.data;

  TestValidator.equals(
    "data length should equal pagination.records",
    data1.length,
    pagination1.records,
  );

  // Ensure each result is active and has the correct region code
  for (const summary of data1) {
    typia.assert<IShoppingMallShippingZoneSetting.ISummary>(summary);

    TestValidator.predicate(
      "each summary should be active",
      summary.active === true,
    );

    const regionSummary = summary.region;
    TestValidator.predicate(
      "each summary should have region assigned",
      regionSummary !== undefined,
    );

    if (regionSummary !== undefined) {
      TestValidator.equals(
        "summary.region.code should equal filter region code",
        regionSummary.code,
        region.code,
      );

      TestValidator.equals(
        "region active flag in summary should match original region active flag",
        regionSummary.active,
        region.active,
      );
    }
  }

  // Validate that all expected codes are present and no extras from main region
  const returnedCodes = data1.map((s) => s.code).sort();
  const expectedCodes = expectedActiveMainRegionZones.map((z) => z.code).sort();

  TestValidator.equals(
    "returned codes should equal expected active main-region zone codes",
    returnedCodes,
    expectedCodes,
  );

  // 9. Second search: regionCode that does not exist, expecting empty result
  const nonExistentRegionCode = `${region.code}_NONEXIST`;
  const requestBody2 = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize,
    search: undefined,
    code: undefined,
    name: undefined,
    active: true,
    regionCode: nonExistentRegionCode,
    sortBy: "code" as const,
    sortDirection: "asc" as const,
  } satisfies IShoppingMallShippingZoneSetting.IRequest;

  const page2: IPageIShoppingMallShippingZoneSetting.ISummary =
    await api.functional.shoppingMall.platformAdmin.shippingZoneSettings.index(
      connection,
      { body: requestBody2 },
    );
  typia.assert(page2);

  const pagination2 = page2.pagination;
  typia.assert<IPage.IPagination>(pagination2);

  TestValidator.equals(
    "second search should have zero records",
    pagination2.records,
    0,
  );

  TestValidator.equals(
    "second search should have zero pages when no records",
    pagination2.pages,
    0,
  );

  TestValidator.equals(
    "second search data should be empty array",
    page2.data.length,
    0,
  );
}
