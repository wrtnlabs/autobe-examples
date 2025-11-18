import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRiskCase";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";

export async function test_api_risk_case_search_date_range_filters(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authorized context
  const admin = await api.functional.auth.admin.join(connection, {
    body: typia.random<IShoppingMallAdminJoin.ICreate>(),
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Create three distinct risk cases: EARLY, MIDDLE, LATE
  const labels = ["EARLY", "MIDDLE", "LATE"] as const;
  const createdCases: IShoppingMallRiskCase[] = [];

  for (const label of labels) {
    const randomBase = typia.random<IShoppingMallRiskCase.ICreate>();
    const body = {
      ...randomBase,
      case_code: `${label}_${randomBase.case_code}`,
      title: `${label} - ${randomBase.title}`,
    } satisfies IShoppingMallRiskCase.ICreate;

    const created = await api.functional.shoppingMall.admin.riskCases.create(
      connection,
      { body },
    );
    typia.assert<IShoppingMallRiskCase>(created);
    createdCases.push(created);
  }

  const [earlyCase, middleCase, lateCase] = createdCases;

  // 3. Unfiltered listing to retrieve summaries and their created_at
  const fullPage = await api.functional.shoppingMall.admin.riskCases.index(
    connection,
    {
      body: {
        page: 1 as number & tags.Type<"int32">,
        limit: 100 as number & tags.Type<"int32">,
        sortBy: "created_at",
        sortOrder: "asc",
      } satisfies IShoppingMallRiskCase.IRequest,
    },
  );
  typia.assert<IPageIShoppingMallRiskCase.ISummary>(fullPage);

  const summaries = fullPage.data;

  const matchById = (id: string) => summaries.find((s) => s.id === id) ?? null;

  const earlySummary = matchById(earlyCase.id);
  const middleSummary = matchById(middleCase.id);
  const lateSummary = matchById(lateCase.id);

  TestValidator.predicate(
    "all three created cases must appear in unfiltered listing",
    earlySummary !== null && middleSummary !== null && lateSummary !== null,
  );

  const ordered = [earlySummary, middleSummary, lateSummary].sort((a, b) =>
    a!.created_at.localeCompare(b!.created_at),
  );

  const earlyOrdered = ordered[0]!;
  const middleOrdered = ordered[1]!;
  const lateOrdered = ordered[2]!;

  const createdFromRangeB = middleOrdered.created_at;
  const createdToRangeB = lateOrdered.created_at;

  // 4. Range B: [middle, late]
  const rangeBPage = await api.functional.shoppingMall.admin.riskCases.index(
    connection,
    {
      body: {
        page: 1 as number & tags.Type<"int32">,
        limit: 100 as number & tags.Type<"int32">,
        createdFrom: createdFromRangeB,
        createdTo: createdToRangeB,
        sortBy: "created_at",
        sortOrder: "asc",
      } satisfies IShoppingMallRiskCase.IRequest,
    },
  );
  typia.assert<IPageIShoppingMallRiskCase.ISummary>(rangeBPage);

  const rangeBSummaries = rangeBPage.data;
  const idsInRangeB = new Set(rangeBSummaries.map((s) => s.id));

  TestValidator.predicate(
    "EARLY case must be excluded from [middle, late] range",
    !idsInRangeB.has(earlyCase.id),
  );

  TestValidator.predicate(
    "MIDDLE case should be included in [middle, late] range",
    idsInRangeB.has(middleCase.id),
  );

  TestValidator.predicate(
    "LATE case should be included in [middle, late] range",
    idsInRangeB.has(lateCase.id),
  );

  for (const summary of rangeBSummaries) {
    const gteFrom = summary.created_at.localeCompare(createdFromRangeB) >= 0;
    const lteTo = summary.created_at.localeCompare(createdToRangeB) <= 0;

    TestValidator.predicate(
      "every returned case in range B must be within [createdFrom, createdTo]",
      gteFrom && lteTo,
    );
  }

  const expectedCountInRangeB = summaries.filter((s) => {
    return (
      s.created_at.localeCompare(createdFromRangeB) >= 0 &&
      s.created_at.localeCompare(createdToRangeB) <= 0
    );
  }).length;

  TestValidator.equals(
    "pagination.records should match number of cases whose created_at in [from,to]",
    rangeBPage.pagination.records,
    expectedCountInRangeB as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  // 5. Empty result range in the future
  const maxCreatedAt = [
    earlyOrdered.created_at,
    middleOrdered.created_at,
    lateOrdered.created_at,
  ].sort((a, b) => a.localeCompare(b))[2];

  const baseDate = new Date(maxCreatedAt);
  const futureFromDate = new Date(baseDate.getTime() + 60 * 60 * 1000);
  const futureToDate = new Date(baseDate.getTime() + 2 * 60 * 60 * 1000);

  const futureFrom = futureFromDate.toISOString();
  const futureTo = futureToDate.toISOString();

  const futurePage = await api.functional.shoppingMall.admin.riskCases.index(
    connection,
    {
      body: {
        page: 1 as number & tags.Type<"int32">,
        limit: 100 as number & tags.Type<"int32">,
        createdFrom: futureFrom,
        createdTo: futureTo,
      } satisfies IShoppingMallRiskCase.IRequest,
    },
  );
  typia.assert<IPageIShoppingMallRiskCase.ISummary>(futurePage);

  TestValidator.equals(
    "future range with no matching cases should return empty data array",
    futurePage.data.length,
    0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  TestValidator.equals(
    "future range with no matching cases should report 0 records",
    futurePage.pagination.records,
    0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
}
