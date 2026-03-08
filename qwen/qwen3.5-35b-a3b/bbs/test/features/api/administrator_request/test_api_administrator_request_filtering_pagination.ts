import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRequest";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardAdministratorRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_administrator_request_filtering_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup Super Admin Authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    } satisfies IEconomicPoliticalBoardAdmin.ILogin,
  });
  // 2. Test basic pagination - page 1 with pageSize 5
  const page1Response =
    await api.functional.economicPoliticalBoard.admin.pending_requests.index(
      adminConnection,
      {
        body: {
          page: 1,
          pageSize: 5,
        },
      },
    );
  typia.assert(page1Response);
  // Verify pagination metadata
  TestValidator.equals(
    "Page 1 current page",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("Page 1 limit", page1Response.pagination.limit, 5);
  // 3. Test page navigation - page 2
  const page2Response =
    await api.functional.economicPoliticalBoard.admin.pending_requests.index(
      adminConnection,
      {
        body: {
          page: 2,
          pageSize: 5,
        },
      },
    );
  typia.assert(page2Response);
  TestValidator.equals(
    "Page 2 current page",
    page2Response.pagination.current,
    2,
  );
  TestValidator.notEquals(
    "Page 1 and Page 2 should have different data",
    page1Response,
    page2Response,
  );
  // 4. Test status filter - verify only pending requests are returned
  const statusFilteredResponse =
    await api.functional.economicPoliticalBoard.admin.pending_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          pageSize: 10,
        },
      },
    );
  typia.assert(statusFilteredResponse);
  // All returned requests must have status "pending"
  const allPending = statusFilteredResponse.data.every(
    (request) => request.status === "pending",
  );
  TestValidator.predicate(
    "All status-filtered requests are pending",
    allPending,
  );
  // 5. Test text search functionality
  if (page1Response.data.length > 0) {
    const searchKeyword = page1Response.data[0].reason.substring(0, 5);
    const searchResponse =
      await api.functional.economicPoliticalBoard.admin.pending_requests.index(
        adminConnection,
        {
          body: {
            search: searchKeyword,
            pageSize: 10,
          },
        },
      );
    typia.assert(searchResponse);
    // All returned results must contain the search keyword
    const allMatchKeyword = searchResponse.data.every((request) =>
      request.reason.toLowerCase().includes(searchKeyword.toLowerCase()),
    );
    TestValidator.predicate(
      "All search results contain keyword",
      allMatchKeyword,
    );
  }
  // 6. Test empty results scenario
  const emptySearchResponse =
    await api.functional.economicPoliticalBoard.admin.pending_requests.index(
      adminConnection,
      {
        body: {
          search: "NONEXISTENTKEYWORD1234567890",
          pageSize: 20,
        },
      },
    );
  typia.assert(emptySearchResponse);
  TestValidator.equals(
    "Empty search data array length",
    emptySearchResponse.data.length,
    0,
  );
  TestValidator.equals(
    "Empty search total records",
    emptySearchResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "Empty search pages",
    emptySearchResponse.pagination.pages,
    0,
  );
  // 7. Test date range filtering
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const oneWeekAgo = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateRangeResponse =
    await api.functional.economicPoliticalBoard.admin.pending_requests.index(
      adminConnection,
      {
        body: {
          createdAtFrom: oneWeekAgo,
          createdAtTo: oneHourAgo,
          pageSize: 20,
        },
      },
    );
  typia.assert(dateRangeResponse);
  // Verify all returned requests are within the date range
  const allInRange = dateRangeResponse.data.every((request) => {
    const requestDate = new Date(request.createdAt);
    const fromDate = new Date(oneWeekAgo);
    const toDate = new Date(oneHourAgo);
    return requestDate >= fromDate && requestDate <= toDate;
  });
  TestValidator.predicate(
    "All date-range results are within range",
    allInRange,
  );
  // 8. Test sort functionality
  const sortResponse =
    await api.functional.economicPoliticalBoard.admin.pending_requests.index(
      adminConnection,
      {
        body: {
          sort: "createdAt",
          sortOrder: "desc",
          pageSize: 10,
        },
      },
    );
  typia.assert(sortResponse);
  // Verify data is sorted by createdAt descending
  for (let i = 1; i < sortResponse.data.length; i++) {
    const prevDate = new Date(sortResponse.data[i - 1].createdAt);
    const currDate = new Date(sortResponse.data[i].createdAt);
    TestValidator.predicate(
      `Sort descending at index ${i}`,
      currDate <= prevDate,
    );
  }
  // 9. Test pagination metadata calculations
  const paginationResponse =
    await api.functional.economicPoliticalBoard.admin.pending_requests.index(
      adminConnection,
      {
        body: {
          pageSize: 3,
        },
      },
    );
  typia.assert(paginationResponse);
  // Verify pages calculation is correct
  const expectedPages = Math.ceil(paginationResponse.pagination.records / 3);
  TestValidator.equals(
    "Pages calculation",
    paginationResponse.pagination.pages,
    expectedPages,
  );
}
