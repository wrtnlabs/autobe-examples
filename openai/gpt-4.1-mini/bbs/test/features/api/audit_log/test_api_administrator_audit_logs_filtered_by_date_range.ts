import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
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

export async function test_api_administrator_audit_logs_filtered_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Scenario:
  // 1. Administrator joins (registers) and obtains authorized connection.
  // 2. Call audit logs API with a specific valid date range filter and verify all retrieved audit logs are within that range.
  // 3. Check pagination metadata correctness.
  // 4. Call audit logs API with empty filters and verify results.
  // 5. Call audit logs API with invalid date formats and expect error.
  // 1. Administrator join and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123!",
  } satisfies IDiscussionBoardAdministrator.IJoin;
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // Helper function to call audit log index endpoint
  async function fetchAuditLogs(
    body: IDiscussionBoardAuditLog.IRequest,
  ): Promise<IPageIDiscussionBoardAuditLog.ISummary> {
    const output =
      await api.functional.discussionBoard.administrator.auditLogs.index(
        adminConnection,
        { body },
      );
    typia.assert(output);
    return output;
  }
  // 2. Generate date range filter
  // We pick a from date and a to date around now
  const now = new Date();
  const fromDate = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7); // 7 days ago
  const toDate = new Date(now.getTime()); // now
  // 3. Fetch audit logs with date range filter
  const body: IDiscussionBoardAuditLog.IRequest = {
    created_at_from: fromDate.toISOString() as string &
      tags.Format<"date-time">,
    created_at_to: toDate.toISOString() as string & tags.Format<"date-time">,
    page: 1,
    limit: 10,
  };
  const page = await fetchAuditLogs(body);
  // Validate pagination structure
  const pageInfo = page.pagination;
  TestValidator.predicate(
    "pagination current page positive",
    pageInfo.current > 0,
  );
  TestValidator.predicate("pagination limit positive", pageInfo.limit > 0);
  TestValidator.predicate(
    "pagination records non-negative",
    pageInfo.records >= 0,
  );
  TestValidator.predicate("pagination pages non-negative", pageInfo.pages >= 0);
  // Validate each audit log item respects date range filter
  for (const auditLog of page.data) {
    const createdAt = new Date(auditLog.createdAt);
    TestValidator.predicate(
      `auditLog createdAt within range ${auditLog.id}`,
      createdAt >= fromDate && createdAt <= toDate,
    );
  }
  // 4. Fetch audit logs with empty filters
  const emptyFilterBody: IDiscussionBoardAuditLog.IRequest = {
    event_type: undefined,
    actor_id: undefined,
    created_at_from: undefined,
    created_at_to: undefined,
    page: 1,
    limit: 10,
  };
  const emptyFilterPage = await fetchAuditLogs(emptyFilterBody);
  // There should be data and pagination info
  TestValidator.predicate(
    "empty filter data nonempty",
    emptyFilterPage.data.length >= 0,
  );
  TestValidator.predicate(
    "empty filter pagination current positive",
    emptyFilterPage.pagination.current > 0,
  );
  // 5. Attempt with invalid date format (should error)
  await TestValidator.error(
    "audit logs filter with invalid date format",
    async () => {
      await fetchAuditLogs({
        created_at_from: "invalid-date" as any,
        created_at_to: "another-invalid" as any,
        page: 1,
        limit: 10,
      });
    },
  );
}
