import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardOperationalLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardOperationalLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardOperationalLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardOperationalLog";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_operational_logs_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Retrieve operational logs with the authenticated admin connection
  const logs =
    await api.functional.discussionBoard.audit.operational.logs.index(
      adminConnection,
    );
  typia.assert(logs);
  // Step 3: Validate pagination structure
  TestValidator.equals("pagination exists", logs.pagination, logs.pagination);
  TestValidator.predicate(
    "current page is positive",
    logs.pagination.current > 0,
  );
  TestValidator.predicate("limit is positive", logs.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    logs.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    logs.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pages calculation is correct",
    logs.pagination.pages ===
      Math.ceil(logs.pagination.records / logs.pagination.limit),
  );
  TestValidator.predicate(
    "current page within range",
    logs.pagination.current >= 1 &&
      logs.pagination.current <= logs.pagination.pages,
  );
  // Step 4: Validate log entries structure and required fields
  TestValidator.predicate("logs array is defined", logs.data !== undefined);
  TestValidator.predicate("logs array exists", Array.isArray(logs.data));
  // Validate each log entry using the full schema validation
  logs.data.forEach((log) => {
    // Validate the complete log structure using typia.assert
    typia.assert<IDiscussionBoardOperationalLog>(log);
    // Additional semantic validation for optional fields
    TestValidator.equals("log id is UUID", typeof log.id, "string");
    TestValidator.predicate(
      "log id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        log.id,
      ),
    );
    TestValidator.equals("log action exists", typeof log.action, "string");
    TestValidator.equals("log actor exists", typeof log.actor, "string");
    TestValidator.equals(
      "log created_at is ISO date-time string",
      typeof log.created_at,
      "string",
    );
    TestValidator.predicate(
      "log created_at is valid date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/i.test(
        log.created_at,
      ),
    );
    // Fix: Use TestValidator.equals for undefined case, TestValidator.predicate with Array.includes for valid values
    if (log.event_severity === undefined) {
      TestValidator.equals("log event_severity is valid", log.event_severity, undefined);
    } else {
      TestValidator.predicate("log event_severity is valid", ["info", "warning", "error", "critical"].includes(log.event_severity));
    }
    // Fix: Use TestValidator.equals for undefined case, TestValidator.predicate with Array.includes for valid values
    if (log.status === undefined) {
      TestValidator.equals("log status is valid", log.status, undefined);
    } else {
      TestValidator.predicate("log status is valid", ["success", "failure", "partial"].includes(log.status));
    }
  });
  // Step 5: Validate chronological order of logs
  TestValidator.predicate(
    "logs are ordered by created_at descending",
    logs.data.length <= 1 ||
      logs.data.every((log, index) => {
        if (index === 0) return true;
        const prevLog = logs.data[index - 1];
        return (
          new Date(log.created_at).getTime() <=
          new Date(prevLog.created_at).getTime()
        );
      }),
  );
}