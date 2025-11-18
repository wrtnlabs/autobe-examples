import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCountry";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";

export async function test_api_countries_search_sorting_by_sort_order(
  connection: api.IConnection,
) {
  // 1. Create an admin via POST /auth/admin/join so that we can call admin-only APIs
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "Admin1234!", // format: password, concrete value is fine
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Using the admin context (token is set into connection by SDK), create three countries
  const baseCode = RandomGenerator.alphaNumeric(6).toUpperCase();

  const countryBodies = [
    {
      country_code: `${baseCode}A`,
      name_en: `Country ${baseCode} A`,
      phone_code: "+101",
      is_active: true,
      sort_order: 10,
    },
    {
      country_code: `${baseCode}B`,
      name_en: `Country ${baseCode} B`,
      phone_code: "+102",
      is_active: true,
      sort_order: 20,
    },
    {
      country_code: `${baseCode}C`,
      name_en: `Country ${baseCode} C`,
      phone_code: "+103",
      is_active: true,
      sort_order: 30,
    },
  ] satisfies IShoppingMallCountry.ICreate[];

  const createdCountries: IShoppingMallCountry[] = [];
  for (const body of countryBodies) {
    const created = await api.functional.shoppingMall.admin.countries.create(
      connection,
      { body },
    );
    typia.assert(created);
    createdCountries.push(created);
  }

  // Helper to extract our three summaries from a page response
  // preserving the original order of appearance in page.data.
  const findOurSummariesInOrder = (
    page: IPageIShoppingMallCountry.ISummary,
  ): IShoppingMallCountry.ISummary[] => {
    const codes = new Set(createdCountries.map((c) => c.country_code));
    const summaries: IShoppingMallCountry.ISummary[] = [];
    for (const item of page.data) {
      if (codes.has(item.country_code)) summaries.push(item);
    }
    return summaries;
  };

  // 3. Call PATCH /shoppingMall/countries with sort_field="sort_order" and sort_direction="asc"
  const requestAsc = {
    page: 0,
    limit: 50,
    sort_field: "sort_order",
    sort_direction: "asc",
  } satisfies IShoppingMallCountry.IRequest;

  const pageAsc: IPageIShoppingMallCountry.ISummary =
    await api.functional.shoppingMall.countries.index(connection, {
      body: requestAsc,
    });
  typia.assert(pageAsc);

  const ourAscSummaries = findOurSummariesInOrder(pageAsc);
  TestValidator.predicate(
    "all three seeded countries must appear in asc result",
    ourAscSummaries.length === 3,
  );

  const ascOrders = ourAscSummaries.map((s) => s.sort_order);
  TestValidator.equals(
    "ascending sort_order sequence is 10,20,30",
    ascOrders,
    [10, 20, 30],
  );

  // 4. Call PATCH /shoppingMall/countries with sort_direction="desc"
  const requestDesc = {
    page: requestAsc.page,
    limit: requestAsc.limit,
    sort_field: requestAsc.sort_field,
    sort_direction: "desc",
  } satisfies IShoppingMallCountry.IRequest;

  const pageDesc: IPageIShoppingMallCountry.ISummary =
    await api.functional.shoppingMall.countries.index(connection, {
      body: requestDesc,
    });
  typia.assert(pageDesc);

  const ourDescSummaries = findOurSummariesInOrder(pageDesc);
  TestValidator.predicate(
    "all three seeded countries must appear in desc result",
    ourDescSummaries.length === 3,
  );

  const descOrders = ourDescSummaries.map((s) => s.sort_order);
  TestValidator.equals(
    "descending sort_order sequence is 30,20,10",
    descOrders,
    [30, 20, 10],
  );

  // 5. Basic pagination metadata sanity checks on asc result
  const paginationAsc = pageAsc.pagination;
  TestValidator.predicate(
    "limit is non-negative and at least number of asc data records",
    paginationAsc.limit >= 0 && paginationAsc.limit >= pageAsc.data.length,
  );
  TestValidator.predicate(
    "records count is >= data length",
    paginationAsc.records >= pageAsc.data.length,
  );
  TestValidator.predicate(
    "pages count is positive when there are records",
    paginationAsc.records === 0
      ? paginationAsc.pages === 0
      : paginationAsc.pages >= 1,
  );

  // 6. Stability check: repeat asc and desc queries and ensure ordering of our three countries is stable
  const pageAsc2 = await api.functional.shoppingMall.countries.index(
    connection,
    { body: requestAsc },
  );
  typia.assert(pageAsc2);
  const ascOrders2 = findOurSummariesInOrder(pageAsc2).map((s) => s.sort_order);
  TestValidator.equals(
    "ascending order stable between repeated calls",
    ascOrders2,
    ascOrders,
  );

  const pageDesc2 = await api.functional.shoppingMall.countries.index(
    connection,
    { body: requestDesc },
  );
  typia.assert(pageDesc2);
  const descOrders2 = findOurSummariesInOrder(pageDesc2).map(
    (s) => s.sort_order,
  );
  TestValidator.equals(
    "descending order stable between repeated calls",
    descOrders2,
    descOrders,
  );
}
