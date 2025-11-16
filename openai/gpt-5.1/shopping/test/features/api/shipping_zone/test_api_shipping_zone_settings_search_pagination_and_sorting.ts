import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShippingZoneSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShippingZoneSetting";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";
import type { IShoppingMallShippingZoneSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingZoneSetting";

export async function test_api_shipping_zone_settings_search_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Bootstrap platform admin session
  const adminJoinBody = typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);
  await TestValidator.predicate(
    "platform admin must be active after join",
    admin.isActive === true,
  );

  // 2. Create a primary region configuration
  const regionCreateBody = typia.random<IShoppingMallRegionSetting.ICreate>();
  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      {
        body: regionCreateBody,
      },
    );
  typia.assert(region);
  TestValidator.equals(
    "created region active flag must match request",
    region.active,
    regionCreateBody.active,
  );

  // 3. Create multiple shipping zone settings associated with this region
  const ZONE_COUNT = 18;
  const createdZones: IShoppingMallShippingZoneSetting[] = [];

  for (let i = 0; i < ZONE_COUNT; i++) {
    const numeric = i + 1;
    const codeSuffix = numeric.toString().padStart(4, "0");
    const code = `ZONE_${codeSuffix}`;

    const createBody = {
      code,
      name: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.paragraph({ sentences: 4 }),
      active: true,
      shopping_mall_region_setting_id: region.id,
    } satisfies IShoppingMallShippingZoneSetting.ICreate;

    const zone =
      await api.functional.shoppingMall.platformAdmin.shippingZoneSettings.create(
        connection,
        { body: createBody },
      );
    typia.assert(zone);
    createdZones.push(zone);
  }

  // Pre-compute expected code ordering for our created zones (ascending)
  const createdCodesAsc: string[] = [...createdZones]
    .map((z) => z.code)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const createdCodesDesc: string[] = [...createdCodesAsc].reverse();

  const createdCodeSet = new Set(createdCodesAsc);

  // Helper to map zone code to its index in expected asc/desc ordering
  const ascIndexOf = (code: string): number => createdCodesAsc.indexOf(code);
  const descIndexOf = (code: string): number => createdCodesDesc.indexOf(code);

  const PAGE_SIZE = 10;

  // 4. Fetch first page (page=1) with sortBy=code, asc
  const page1RequestBody = {
    page: 1,
    pageSize: PAGE_SIZE,
    sortBy: "code",
    sortDirection: "asc",
  } satisfies IShoppingMallShippingZoneSetting.IRequest;

  const page1: IPageIShoppingMallShippingZoneSetting.ISummary =
    await api.functional.shoppingMall.platformAdmin.shippingZoneSettings.index(
      connection,
      { body: page1RequestBody },
    );
  typia.assert(page1);

  const pagination1 = page1.pagination;
  TestValidator.predicate(
    "first page current index should be 0 (zero-based)",
    pagination1.current === 0,
  );
  TestValidator.equals(
    "first page limit should equal requested pageSize",
    pagination1.limit,
    PAGE_SIZE,
  );
  TestValidator.predicate(
    "first page data length must not exceed page size",
    page1.data.length <= PAGE_SIZE,
  );

  // 5. Fetch second page (page=2) with same sort
  const page2RequestBody = {
    page: 2,
    pageSize: PAGE_SIZE,
    sortBy: "code",
    sortDirection: "asc",
  } satisfies IShoppingMallShippingZoneSetting.IRequest;

  const page2: IPageIShoppingMallShippingZoneSetting.ISummary =
    await api.functional.shoppingMall.platformAdmin.shippingZoneSettings.index(
      connection,
      { body: page2RequestBody },
    );
  typia.assert(page2);

  const pagination2 = page2.pagination;
  TestValidator.predicate(
    "second page current index should be 1 (zero-based)",
    pagination2.current === 1,
  );
  TestValidator.equals(
    "second page limit should equal requested pageSize",
    pagination2.limit,
    PAGE_SIZE,
  );
  TestValidator.predicate(
    "second page data length must not exceed page size",
    page2.data.length <= PAGE_SIZE,
  );

  // Ensure no overlap between IDs returned in page1 and page2
  const page1Ids = new Set(page1.data.map((s) => s.id));
  const page2Ids = new Set(page2.data.map((s) => s.id));
  let hasOverlap = false;
  for (const id of page1Ids) {
    if (page2Ids.has(id)) {
      hasOverlap = true;
      break;
    }
  }
  TestValidator.predicate(
    "page1 and page2 summaries must not overlap by id",
    hasOverlap === false,
  );

  // 6. Validate ordering for our created zones across page1 + page2 (asc)
  const combinedAsc = [...page1.data, ...page2.data];
  const ourSummariesAsc = combinedAsc.filter((s) => createdCodeSet.has(s.code));

  // Our summaries should appear in ascending order of code relative to our expected list
  let lastAscIndex = -1;
  for (const summary of ourSummariesAsc) {
    const idx = ascIndexOf(summary.code);
    TestValidator.predicate(
      "summary code from asc pages must exist in created asc list",
      idx !== -1,
    );
    TestValidator.predicate(
      "our created shipping zones must appear in ascending code order",
      idx > lastAscIndex,
    );
    lastAscIndex = idx;

    // Validate region & active flags for our zones
    TestValidator.predicate(
      "summary for our zone must be active",
      summary.active === true,
    );
    TestValidator.predicate(
      "summary for our zone must have region summary defined",
      summary.region !== undefined,
    );
    if (summary.region !== undefined) {
      TestValidator.equals(
        "summary region id must match created region id",
        summary.region.id,
        region.id,
      );
      TestValidator.equals(
        "summary region code must match created region code",
        summary.region.code,
        region.code,
      );
      TestValidator.equals(
        "summary region active flag must match created region",
        summary.region.active,
        region.active,
      );
    }
  }

  // 7. Validate that we see at least some of our created zones within the first two pages
  TestValidator.predicate(
    "at least one of our created zones must appear in first two pages",
    ourSummariesAsc.length > 0,
  );

  // 8. Fetch first page with descending order by code
  const pageDescRequestBody = {
    page: 1,
    pageSize: PAGE_SIZE,
    sortBy: "code",
    sortDirection: "desc",
  } satisfies IShoppingMallShippingZoneSetting.IRequest;

  const pageDesc: IPageIShoppingMallShippingZoneSetting.ISummary =
    await api.functional.shoppingMall.platformAdmin.shippingZoneSettings.index(
      connection,
      { body: pageDescRequestBody },
    );
  typia.assert(pageDesc);

  const paginationDesc = pageDesc.pagination;
  TestValidator.predicate(
    "desc first page current index should be 0 (zero-based)",
    paginationDesc.current === 0,
  );
  TestValidator.equals(
    "desc first page limit should equal requested pageSize",
    paginationDesc.limit,
    PAGE_SIZE,
  );
  TestValidator.predicate(
    "desc first page data length must not exceed page size",
    pageDesc.data.length <= PAGE_SIZE,
  );

  const ourSummariesDesc = pageDesc.data.filter((s) =>
    createdCodeSet.has(s.code),
  );

  let lastDescIndex = -1;
  for (const summary of ourSummariesDesc) {
    const idx = descIndexOf(summary.code);
    TestValidator.predicate(
      "summary code from desc page must exist in created desc list",
      idx !== -1,
    );
    TestValidator.predicate(
      "our created zones on desc page must respect descending code order",
      idx > lastDescIndex,
    );
    lastDescIndex = idx;
  }
}
