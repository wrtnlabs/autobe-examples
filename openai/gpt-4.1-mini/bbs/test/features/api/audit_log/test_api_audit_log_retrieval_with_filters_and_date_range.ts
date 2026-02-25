import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_audit_log_retrieval_with_filters_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as superAdministrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & typia.tags.Format<"email">>(),
        password: "TestPassword1234",
        href: typia.random<string & typia.tags.Format<"uri">>(),
        referrer: typia.random<string & typia.tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  typia.assert(superAdmin);
  // 2. Setup filters
  const eventType = "login";
  const actorId = superAdmin.id;
  // Define createdAt date range boundaries
  const createdAtFrom = new Date();
  createdAtFrom.setHours(createdAtFrom.getHours() - 1); // 1 hour ago
  const createdAtTo = new Date();
  // Use ISO strings for filtering
  const createdAtFromISOString = createdAtFrom.toISOString();
  const createdAtToISOString = createdAtTo.toISOString();
  // 3. Initial query to get audit logs with filters
  const page1 =
    await api.functional.discussionBoard.superAdministrator.auditLogs.index(
      superAdminConnection,
      {
        body: {
          event_type: eventType,
          actor_id: actorId,
          created_at_from: createdAtFromISOString,
          created_at_to: createdAtToISOString,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(page1);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "current page should be 1",
    page1.pagination.current === 1,
  );
  TestValidator.predicate("limit should be 10", page1.pagination.limit === 10);
  TestValidator.predicate(
    "pages should be equal or greater than 0",
    page1.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "records count not negative",
    page1.pagination.records >= 0,
  );
  // 5. Validate each audit log entry
  for (const log of page1.data) {
    typia.assert(log);
    TestValidator.equals("eventType matches filter", log.eventType, eventType);
    if (log.actor !== null && log.actor !== undefined) {
      TestValidator.equals("actor ID matches filter", log.actor.id, actorId);
    } else {
      TestValidator.predicate(
        "actor should be present for filtered actor ID",
        false,
      );
    }
    const createdAt = new Date(log.createdAt);
    TestValidator.predicate(
      "createdAt within range",
      createdAt >= createdAtFrom && createdAt <= createdAtTo,
    );
  }
  // 6. Check boundary conditions inclusivity for createdAt_from and createdAt_to
  // Create an audit log with exact from date and exact to date if possible (simulate)
  // Since creation of audit logs not in specs, we test by filtering exactly on boundaries
  // Exact from date filter
  const exactFromPage =
    await api.functional.discussionBoard.superAdministrator.auditLogs.index(
      superAdminConnection,
      {
        body: {
          created_at_from: createdAtFromISOString,
          created_at_to: createdAtToISOString,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(exactFromPage);
  for (const log of exactFromPage.data) {
    typia.assert(log);
    const createdAt = new Date(log.createdAt);
    TestValidator.predicate(
      "created at >= created_at_from boundary",
      createdAt >= createdAtFrom,
    );
    TestValidator.predicate(
      "created at <= created_at_to boundary",
      createdAt <= createdAtTo,
    );
  }
  // 7. Test unauthorized access - use connection without authorization
  await TestValidator.error("reject unauthorized access", async () => {
    await api.functional.discussionBoard.superAdministrator.auditLogs.index(
      { host: connection.host },
      {
        body: {
          event_type: eventType,
          actor_id: actorId,
          created_at_from: createdAtFromISOString,
          created_at_to: createdAtToISOString,
          page: 1,
          limit: 10,
        },
      },
    );
  });
}
