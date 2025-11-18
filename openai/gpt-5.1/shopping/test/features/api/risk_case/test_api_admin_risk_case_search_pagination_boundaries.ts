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

export async function test_api_admin_risk_case_search_pagination_boundaries(
  connection: api.IConnection,
) {
  // 0. Admin join to obtain authorized admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 1. Bulk create risk cases exceeding one page
  const totalToCreate = 45;
  const pageLimit = 20;
  const commonStatus = "open";
  const commonSeverity = "high";

  const createdCases: IShoppingMallRiskCase[] = [];

  for (let i = 0; i < totalToCreate; i++) {
    const body = {
      case_code: `RISK-${i.toString().padStart(3, "0")}`,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 6 }),
      status: commonStatus,
      severity: commonSeverity,
      primary_subject_type: "order",
      primary_subject_id: typia.random<string & tags.Format<"uuid">>(),
      primary_subject_display: RandomGenerator.paragraph({ sentences: 2 }),
      sla_due_at: null,
    } satisfies IShoppingMallRiskCase.ICreate;

    const created: IShoppingMallRiskCase =
      await api.functional.shoppingMall.admin.riskCases.create(connection, {
        body,
      });
    typia.assert(created);
    createdCases.push(created);
  }

  // Helper to extract ids and case codes from summaries
  const collectKeys = (
    items: IShoppingMallRiskCase.ISummary[],
  ): { ids: string[]; codes: string[] } => {
    const ids = items.map((item) => item.id);
    const codes = items.map((item) => item.case_code);
    return { ids, codes };
  };

  // 2. First page search (page 1)
  const page1Body = {
    page: 1 as number & tags.Type<"int32">,
    limit: pageLimit as number & tags.Type<"int32">,
    status: commonStatus,
    severity: commonSeverity,
  } satisfies IShoppingMallRiskCase.IRequest;

  const page1: IPageIShoppingMallRiskCase.ISummary =
    await api.functional.shoppingMall.admin.adminSearch.riskCases.index(
      connection,
      { body: page1Body },
    );
  typia.assert(page1);

  TestValidator.equals(
    "page 1: current page is 1",
    page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1: limit equals requested limit",
    page1.pagination.limit,
    pageLimit,
  );
  TestValidator.equals(
    "page 1: data length equals limit or available records",
    page1.data.length,
    Math.min(pageLimit, page1.pagination.records),
  );

  const page1Keys = collectKeys(page1.data);

  // 3. Second page search (page 2)
  const page2Body = {
    page: 2 as number & tags.Type<"int32">,
    limit: pageLimit as number & tags.Type<"int32">,
    status: commonStatus,
    severity: commonSeverity,
  } satisfies IShoppingMallRiskCase.IRequest;

  const page2: IPageIShoppingMallRiskCase.ISummary =
    await api.functional.shoppingMall.admin.adminSearch.riskCases.index(
      connection,
      { body: page2Body },
    );
  typia.assert(page2);

  TestValidator.equals(
    "page 2: current page is 2",
    page2.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2: limit equals requested limit",
    page2.pagination.limit,
    pageLimit,
  );

  const expectedPage2Length = Math.max(
    0,
    Math.min(pageLimit, page2.pagination.records - pageLimit),
  );
  TestValidator.equals(
    "page 2: data length within expected range",
    page2.data.length,
    expectedPage2Length,
  );

  const page2Keys = collectKeys(page2.data);

  // Ensure no overlap between page 1 and page 2 ids
  const overlappingIdsPage1Page2 = page2Keys.ids.filter((id) =>
    page1Keys.ids.includes(id),
  );
  TestValidator.equals(
    "no overlapping ids between page 1 and page 2",
    overlappingIdsPage1Page2.length,
    0,
  );

  // 4. Third page search (page 3)
  const page3Body = {
    page: 3 as number & tags.Type<"int32">,
    limit: pageLimit as number & tags.Type<"int32">,
    status: commonStatus,
    severity: commonSeverity,
  } satisfies IShoppingMallRiskCase.IRequest;

  const page3: IPageIShoppingMallRiskCase.ISummary =
    await api.functional.shoppingMall.admin.adminSearch.riskCases.index(
      connection,
      { body: page3Body },
    );
  typia.assert(page3);

  TestValidator.equals(
    "page 3: current page is 3",
    page3.pagination.current,
    3,
  );
  TestValidator.equals(
    "page 3: limit equals requested limit",
    page3.pagination.limit,
    pageLimit,
  );

  const consumedFirstTwoPages = pageLimit * 2;
  const expectedPage3Length = Math.max(
    0,
    Math.min(pageLimit, page3.pagination.records - consumedFirstTwoPages),
  );
  TestValidator.equals(
    "page 3: data length equals remaining records or zero",
    page3.data.length,
    expectedPage3Length,
  );

  const page3Keys = collectKeys(page3.data);

  // Ensure disjoint ids across pages 1, 2, and 3
  const allIds = [...page1Keys.ids, ...page2Keys.ids, ...page3Keys.ids];
  const uniqueIds = Array.from(new Set(allIds));
  TestValidator.equals(
    "ids across first three pages are unique",
    allIds.length,
    uniqueIds.length,
  );

  // 5. Pagination metadata consistency
  const meta = page1.pagination;

  TestValidator.predicate(
    "total records should be at least number of created cases",
    meta.records >= createdCases.length,
  );

  const expectedPagesFromMeta =
    meta.limit === 0 ? 0 : Math.ceil(meta.records / meta.limit);
  TestValidator.equals(
    "pages equals ceil(records/limit)",
    meta.pages,
    expectedPagesFromMeta,
  );

  // 6. Request page beyond the last
  const beyondPage = meta.pages + 1;

  const beyondBody = {
    page: beyondPage as number & tags.Type<"int32">,
    limit: pageLimit as number & tags.Type<"int32">,
    status: commonStatus,
    severity: commonSeverity,
  } satisfies IShoppingMallRiskCase.IRequest;

  const beyond: IPageIShoppingMallRiskCase.ISummary =
    await api.functional.shoppingMall.admin.adminSearch.riskCases.index(
      connection,
      { body: beyondBody },
    );
  typia.assert(beyond);

  TestValidator.equals(
    "beyond page: current page matches requested beyond page",
    beyond.pagination.current,
    beyondPage,
  );
  TestValidator.equals(
    "beyond page: records remain consistent",
    beyond.pagination.records,
    meta.records,
  );
  TestValidator.equals(
    "beyond page: pages remain consistent",
    beyond.pagination.pages,
    meta.pages,
  );
  TestValidator.equals(
    "beyond page: data should be empty",
    beyond.data.length,
    0,
  );
}
