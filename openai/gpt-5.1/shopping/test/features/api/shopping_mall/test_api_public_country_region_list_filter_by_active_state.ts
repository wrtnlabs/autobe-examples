import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRegion";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";

/**
 * Validate public region listing filter by is_active state.
 *
 * Business context: Public (anonymous) clients should be able to query regions
 * of a given country and rely on the server-side `is_active` filter to obtain
 * only active or only inactive regions. When the filter is not provided, both
 * active and inactive regions should be returned.
 *
 * Steps:
 *
 * 1. Join as an admin to obtain admin context.
 * 2. Create a dedicated country identified by a unique `country_code`.
 * 3. Under that country, create multiple regions:
 *
 *    - Some with `is_active = true`.
 *    - Some with `is_active = false`.
 * 4. As an anonymous client, call PATCH
 *    /shoppingMall/countries/{countryCode}/regions with `is_active = true` and
 *    assert that only active regions are returned and none of the inactive
 *    regions appear.
 * 5. Call again with `is_active = false` and assert that only inactive regions are
 *    returned and they match the set created as inactive.
 * 6. Call once more without the `is_active` filter (or with it set to null) and
 *    assert that both active and inactive regions appear in the result set.
 */
export async function test_api_public_country_region_list_filter_by_active_state(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain administrative privileges
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a dedicated country
  const countryCode = `TEST-${RandomGenerator.alphabets(8)}`;

  const countryCreateBody = {
    country_code: countryCode,
    name_en: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 8,
    }),
    phone_code: "+82",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);
  TestValidator.equals(
    "created country uses requested country_code",
    country.country_code,
    countryCode,
  );

  // 3. Create multiple regions under this country: active and inactive
  const activeRegions: IShoppingMallRegion[] = [];
  const inactiveRegions: IShoppingMallRegion[] = [];

  const createRegion = async (
    codeSuffix: string,
    isActive: boolean,
    sortOrder: number,
  ): Promise<IShoppingMallRegion> => {
    const regionCreateBody = {
      code: `R-${codeSuffix}`,
      name_en: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 3,
        wordMax: 8,
      }),
      region_type: "state",
      is_active: isActive,
      sort_order: sortOrder,
    } satisfies IShoppingMallRegion.ICreate;

    const region: IShoppingMallRegion =
      await api.functional.shoppingMall.admin.countries.regions.create(
        connection,
        {
          countryCode: countryCode,
          body: regionCreateBody,
        },
      );
    typia.assert(region);
    TestValidator.equals(
      "region belongs to created country (via summary)",
      region.country.country_code,
      countryCode,
    );
    return region;
  };

  // create 2 active and 2 inactive regions
  activeRegions.push(await createRegion("A1", true, 1));
  activeRegions.push(await createRegion("A2", true, 2));
  inactiveRegions.push(await createRegion("I1", false, 3));
  inactiveRegions.push(await createRegion("I2", false, 4));

  const activeIds = activeRegions.map((r) => r.id);
  const inactiveIds = inactiveRegions.map((r) => r.id);

  // Prepare a public (anonymous) connection by stripping headers
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Common listing body base (without is_active)
  const listingBaseBody = {
    page: 1,
    limit: 20,
  } satisfies IShoppingMallRegion.IRequest;

  // 4. Query with is_active = true
  const activeListRequestBody: IShoppingMallRegion.IRequest = {
    ...listingBaseBody,
    is_active: true,
  };

  const activePage: IPageIShoppingMallRegion.ISummary =
    await api.functional.shoppingMall.countries.regions.index(
      publicConnection,
      {
        countryCode,
        body: activeListRequestBody,
      },
    );
  typia.assert(activePage);

  // All returned regions must be active
  for (const summary of activePage.data) {
    TestValidator.predicate(
      "all regions returned when filtering by is_active=true must be active",
      summary.is_active === true,
    );
  }

  // None of the explicitly created inactive region IDs should appear
  const activePageIds = activePage.data.map((s) => s.id);
  for (const inactiveId of inactiveIds) {
    TestValidator.predicate(
      "inactive region IDs must not appear when filtering by is_active=true",
      activePageIds.includes(inactiveId) === false,
    );
  }

  // 5. Query with is_active = false
  const inactiveListRequestBody: IShoppingMallRegion.IRequest = {
    ...listingBaseBody,
    is_active: false,
  };

  const inactivePage: IPageIShoppingMallRegion.ISummary =
    await api.functional.shoppingMall.countries.regions.index(
      publicConnection,
      {
        countryCode,
        body: inactiveListRequestBody,
      },
    );
  typia.assert(inactivePage);

  const inactivePageIds = inactivePage.data.map((s) => s.id);

  // All returned regions must be inactive
  for (const summary of inactivePage.data) {
    TestValidator.predicate(
      "all regions returned when filtering by is_active=false must be inactive",
      summary.is_active === false,
    );
  }

  // Created inactive regions must be contained in the result (within this page)
  for (const expectedId of inactiveIds) {
    TestValidator.predicate(
      "all created inactive regions should be returned when filtering by is_active=false",
      inactivePageIds.includes(expectedId),
    );
  }

  // 6. Query without is_active filter (omit field to represent no filtering)
  const noFilterRequestBody: IShoppingMallRegion.IRequest = {
    ...listingBaseBody,
    is_active: undefined,
  };

  const allPage: IPageIShoppingMallRegion.ISummary =
    await api.functional.shoppingMall.countries.regions.index(
      publicConnection,
      {
        countryCode,
        body: noFilterRequestBody,
      },
    );
  typia.assert(allPage);

  const allPageIds = allPage.data.map((s) => s.id);

  // All created regions (active and inactive) should be included
  for (const expectedId of [...activeIds, ...inactiveIds]) {
    TestValidator.predicate(
      "when not filtering by is_active, all created regions should be included in the first page",
      allPageIds.includes(expectedId),
    );
  }

  // Ensure both active and inactive regions appear in the combined result
  const hasActive = allPage.data.some((s) => s.is_active === true);
  const hasInactive = allPage.data.some((s) => s.is_active === false);

  TestValidator.predicate(
    "combined result without is_active filter should include at least one active region",
    hasActive,
  );
  TestValidator.predicate(
    "combined result without is_active filter should include at least one inactive region",
    hasInactive,
  );
}
