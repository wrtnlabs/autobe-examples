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

export async function test_api_administrator_audit_logs_filtered_by_event_and_actor(
  connection: api.IConnection,
): Promise<void> {
  // Comment: Test the retrieval of audit logs filtered by event type and actor ID
  // 1. Administrator join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin_${typia.random<string & typia.tags.Format<"email">>()}`,
      password: "securePassword123",
    },
  });
  typia.assert(administrator);
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${administrator.token.access}`,
  };
  // 2. Retrieve first page of audit logs without filter to find a valid actor and event to test filtering
  const initialPage =
    await api.functional.discussionBoard.administrator.auditLogs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(initialPage);
  // Choose a non-null actor from audit logs if any
  const logsWithActors = initialPage.data.filter(
    (log) => log.actor?.id !== undefined,
  );
  if (logsWithActors.length === 0) {
    // No logs with actor found; the test cannot proceed meaningfully
    return;
  }
  // Pick first log with actor
  const firstLog = logsWithActors[0];
  // Use the eventType and actor.id for filtering
  const eventTypeFilter = firstLog.eventType;
  const actorIdFilter = firstLog.actor!.id;
  // 3. Retrieve audit logs filtered by eventType and actor ID
  const filteredPage =
    await api.functional.discussionBoard.administrator.auditLogs.index(
      adminConnection,
      {
        body: {
          event_type: eventTypeFilter,
          actor_id: actorIdFilter,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(filteredPage);
  // 4. Verify all audit logs in results match the filter criteria
  filteredPage.data.forEach((log) => {
    TestValidator.equals(
      "eventType matches filter",
      log.eventType,
      eventTypeFilter,
    );
    TestValidator.equals(
      "actor ID matches filter",
      log.actor?.id,
      actorIdFilter,
    );
  });
  // 5. Verify pagination metadata correctness
  TestValidator.predicate(
    "pagination current page is 1",
    filteredPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 20",
    filteredPage.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    filteredPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    filteredPage.pagination.pages >= 0,
  );
  // 6. Error handling: invalid actor_id UUID format
  await TestValidator.error("invalid UUID format for actor_id", async () => {
    await api.functional.discussionBoard.administrator.auditLogs.index(
      adminConnection,
      {
        body: {
          actor_id: "invalid-uuid-format",
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  });
  // 7. Error handling: unsupported event_type value (assuming 'unsupported-event-type' is invalid)
  await TestValidator.error("unsupported event_type value", async () => {
    await api.functional.discussionBoard.administrator.auditLogs.index(
      adminConnection,
      {
        body: {
          event_type: "unsupported-event-type",
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  });
}
