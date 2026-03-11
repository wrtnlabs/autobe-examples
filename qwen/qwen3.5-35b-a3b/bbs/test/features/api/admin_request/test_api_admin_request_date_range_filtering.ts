import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRequest";
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

export async function test_api_admin_request_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create super administrator for filtering requests
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminDisplayName = RandomGenerator.name();
  const adminBio = RandomGenerator.paragraph({ sentences: 2 });
  const adminHref = typia.random<string & tags.Format<"uri">>();
  const adminReferrer = typia.random<string & tags.Format<"uri">>();
  const adminIp = typia.random<string & tags.Format<"ipv4">>();
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      displayName: adminDisplayName,
      bio: adminBio,
      href: adminHref,
      referrer: adminReferrer,
      ip: adminIp,
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(adminConnection.headers!.Authorization);
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(superAdminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEconomicPoliticalBoardAdmin.ILogin,
  });
  // 2. Create member accounts with specific timestamps for admin request submissions
  const baseDate = new Date();
  const memberRequests: Array<{
    email: string;
    password: string;
    name: string;
    created_at: Date;
  }> = [];
  for (let index = 0; index < 5; index++) {
    const memberEmail = typia.random<string & tags.Format<"email">>();
    const memberPassword = RandomGenerator.alphaNumeric(16);
    const memberName = RandomGenerator.name();
    const memberHref = typia.random<string & tags.Format<"uri">>();
    const memberReferrer = typia.random<string & tags.Format<"uri">>();
    const memberIp = typia.random<string & tags.Format<"ipv4">>();
    // Create member account
    await authorize_member_join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        name: memberName,
        href: memberHref,
        referrer: memberReferrer,
        ip: memberIp,
      } satisfies IEconomicPoliticalBoardMember.IJoin,
    });
    // Generate specific created_at timestamp for this request
    const createdTimestamp = new Date(baseDate.getTime() + index * 86400000);
    memberRequests.push({
      email: memberEmail,
      password: memberPassword,
      name: memberName,
      created_at: createdTimestamp,
    });
  }
  // 3. First invocation: Get all pending requests without date filters
  const allRequests =
    await api.functional.economicPoliticalBoard.admin.requests.index(
      superAdminConnection,
      {
        body: {},
      },
    );
  typia.assert(allRequests);
  // Verify initial response structure
  TestValidator.predicate(
    "All requests endpoint returns valid page structure",
    () =>
      allRequests.pagination.current >= 1 &&
      allRequests.pagination.limit > 0 &&
      allRequests.pagination.records >= 0 &&
      allRequests.pagination.pages >= 0,
  );
  // 4. Test date range filtering with partial overlap
  // Use a date range that should match some requests
  const startDate = new Date(baseDate.getTime() + 86400000 * 1); // 1 day after base
  const endDate = new Date(baseDate.getTime() + 86400000 * 3); // 3 days after base
  const filteredRequests =
    await api.functional.economicPoliticalBoard.admin.requests.index(
      superAdminConnection,
      {
        body: {
          startDate: startDate.toISOString().split("T")[0], // YYYY-MM-DD format
          endDate: endDate.toISOString().split("T")[0], // YYYY-MM-DD format
        },
      },
    );
  typia.assert(filteredRequests);
  // 5. Verify filtered results contain only requests within date range
  if (filteredRequests.data.length > 0) {
    for (const request of filteredRequests.data) {
      const requestDate = new Date(request.created_at);
      const startDateOnly = new Date(
        startDate.toISOString().split("T")[0] + "T00:00:00Z",
      );
      const endDateOnly = new Date(
        endDate.toISOString().split("T")[0] + "T23:59:59Z",
      );
      TestValidator.predicate(
        `Request created_at (${request.created_at}) is within filtered range`,
        () => requestDate >= startDateOnly && requestDate <= endDateOnly,
      );
    }
  }
  // 6. Verify pagination metadata reflects filtered results
  TestValidator.equals(
    "Pagination records matches filtered data count",
    filteredRequests.pagination.records,
    filteredRequests.data.length,
  );
  TestValidator.equals(
    "Pagination current is 1",
    filteredRequests.pagination.current,
    1,
  );
  // 7. Third invocation: Test with date range that matches no requests
  const emptyDateRangeStart = new Date(baseDate.getTime() - 86400000 * 365); // 1 year ago
  const emptyDateRangeEnd = new Date(baseDate.getTime() - 86400000 * 360); // ~355 days ago
  const emptyFilter =
    await api.functional.economicPoliticalBoard.admin.requests.index(
      superAdminConnection,
      {
        body: {
          startDate: emptyDateRangeStart.toISOString().split("T")[0],
          endDate: emptyDateRangeEnd.toISOString().split("T")[0],
        },
      },
    );
  typia.assert(emptyFilter);
  // Verify empty results structure
  TestValidator.equals(
    "Empty filter returns no data",
    emptyFilter.data.length,
    0,
  );
  TestValidator.equals(
    "Empty filter has current page 1",
    emptyFilter.pagination.current,
    1,
  );
  TestValidator.equals(
    "Empty filter has records 0",
    emptyFilter.pagination.records,
    0,
  );
  TestValidator.equals(
    "Empty filter has pages 0",
    emptyFilter.pagination.pages,
    0,
  );
  // 8. Test edge case: startDate equals a request's created_at timestamp
  // Get first request from original unfiltered list to use exact timestamp
  if (allRequests.data.length > 0) {
    const exactDate = new Date(allRequests.data[0].created_at);
    const exactDateString = exactDate.toISOString().split("T")[0];
    const exactStartFilter =
      await api.functional.economicPoliticalBoard.admin.requests.index(
        superAdminConnection,
        {
          body: {
            startDate: exactDateString,
          },
        },
      );
    typia.assert(exactStartFilter);
    // Verify request with exact startDate is included
    const includesExactStartDate = exactStartFilter.data.some(
      (request) =>
        new Date(request.created_at).toISOString().split("T")[0] ===
        exactDateString,
    );
    TestValidator.predicate(
      "Request with exact startDate is included",
      () => includesExactStartDate,
    );
  }
  // 9. Test edge case: endDate equals a request's created_at timestamp
  if (allRequests.data.length > 0) {
    const exactDate = new Date(
      allRequests.data[allRequests.data.length - 1].created_at,
    );
    const exactDateString = exactDate.toISOString().split("T")[0];
    const exactEndFilter =
      await api.functional.economicPoliticalBoard.admin.requests.index(
        superAdminConnection,
        {
          body: {
            endDate: exactDateString,
          },
        },
      );
    typia.assert(exactEndFilter);
    // Verify request with exact endDate is included
    const includesExactEndDate = exactEndFilter.data.some(
      (request) =>
        new Date(request.created_at).toISOString().split("T")[0] ===
        exactDateString,
    );
    TestValidator.predicate(
      "Request with exact endDate is included",
      () => includesExactEndDate,
    );
  }
}