import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_audit_logs_filtered_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 3: Retrieval with keyword filter and actor ID
  // - Authenticate as an administrator by joining with valid credentials.
  // - Request a paginated list of audit logs filtered by a keyword in event_description and a specific actor_id.
  // - Validate that only audit log entries containing the keyword in the event_description and performed by the specified actor_id are included.
  // - Validate pagination metadata matches filtered results.
  // - Check that the response respects access control and is only visible to authorized administrator roles.
  // - Confirm correct handling when no logs match the filters (empty data array).
  // - Check response robustness and error handling for filter criteria.
  // 1. Administrator join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuth);
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Prepare a keyword for filtering
  const keyword = "audit"; // typical keyword found in event_description
  // 3. Retrieve a list of audit logs without filters for actor id and keyword to find an existing actor_id with matching event_description
  // The scenario does not provide a direct way to get all logs, so we pass empty filter and fetch page 1 to get data
  const unfilteredLogs =
    await api.functional.discussionBoard.administrator.auditLogs.index(
      adminConnection,
      {
        body: {
          // empty search filter to get unfiltered data for baseline
          // Assuming IRequest may support empty object to fetch all with pagination
          // But schema is empty so passing empty object
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(unfilteredLogs);
  // 4. Extract a valid actor_id and event_description containing the keyword
  let actorId: string | null = null;
  let filteredDescription: string | null = null;
  for (const log of unfilteredLogs.data) {
    if (
      typeof (log as any).event_description === "string" &&
      (log as any).event_description.includes(keyword) &&
      typeof (log as any).actor_id === "string"
    ) {
      actorId = (log as any).actor_id;
      filteredDescription = (log as any).event_description;
      break;
    }
  }
  // 5. If no matching log found, we test with an unlikely actor_id and keyword to test empty results
  if (actorId === null) {
    actorId = "00000000-0000-0000-0000-000000000000"; // non-existent UUID
    filteredDescription = null;
  }
  // 6. Define a valid filter with keyword and actor_id
  const pageLimit = 10;
  const pageNumber = 1;
  const filterBody: IDiscussionBoardAuditLog.IRequest = {
    keyword,
    actor_id: actorId,
    page: pageNumber,
    limit: pageLimit,
  } as any;
  // Above properties assumed; since IRequest is empty in DTO, we use type assertion for our scenario as the scenario specifies filters
  // 7. Make the filtered audit logs request
  const filteredLogs =
    await api.functional.discussionBoard.administrator.auditLogs.index(
      adminConnection,
      {
        body: filterBody,
      },
    );
  typia.assert(filteredLogs);
  // 8. Validate that each audit log entry contains the keyword and matches the actor_id
  for (const entry of filteredLogs.data) {
    await TestValidator.predicate(
      "event_description includes keyword",
      typeof (entry as any).event_description === "string" &&
        (entry as any).event_description.includes(keyword),
    );
    await TestValidator.equals(
      "actor_id matches",
      (entry as any).actor_id,
      actorId,
    );
  }
  // 9. Validate pagination metadata
  await TestValidator.predicate(
    "pagination current page is valid",
    filteredLogs.pagination.current === pageNumber,
  );
  await TestValidator.predicate(
    "pagination limit is valid",
    filteredLogs.pagination.limit === pageLimit,
  );
  await TestValidator.predicate(
    "pagination records are non-negative",
    filteredLogs.pagination.records >= 0,
  );
  await TestValidator.predicate(
    "pagination pages are non-negative",
    filteredLogs.pagination.pages >= 0,
  );
  await TestValidator.predicate(
    "pagination pages consistent with records and limit",
    filteredLogs.pagination.pages ===
      Math.ceil(
        filteredLogs.pagination.records / filteredLogs.pagination.limit,
      ),
  );
  // 10. Test access control: attempt to retrieve audit logs with invalid authorization
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  unauthorizedConnection.headers = { Authorization: `Bearer invalidtoken` };
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.discussionBoard.administrator.auditLogs.index(
      unauthorizedConnection,
      {
        body: filterBody,
      },
    );
  });
  // 11. Test handling of no matching logs: keyword and actor_id combination guaranteed to have no match
  const noMatchFilterBody: IDiscussionBoardAuditLog.IRequest = {
    keyword: "nonexistentkeyword",
    actor_id: "00000000-0000-0000-0000-000000000000",
    page: 1,
    limit: 10,
  } as any;
  const noMatchResult =
    await api.functional.discussionBoard.administrator.auditLogs.index(
      adminConnection,
      {
        body: noMatchFilterBody,
      },
    );
  typia.assert(noMatchResult);
  await TestValidator.equals(
    "no matching logs data array is empty",
    noMatchResult.data.length,
    0,
  );
}
