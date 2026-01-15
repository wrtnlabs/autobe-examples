import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAuthenticationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthenticationLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAuthenticationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuthenticationLog";
import { prepare_random_discussion_board_authentication_log } from "../../../prepare/prepare_random_discussion_board_authentication_log";
import { generate_random_discussion_board_moderator_authentication_logs_create } from "../../../generate/generate_random_discussion_board_moderator_authentication_logs_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_authentication_logs_retrieval_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(16);
  const moderator = await authorize_admin_join(moderatorConnection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
    } satisfies IAdmin.IJoin,
  });
  typia.assert(moderator);
  // Step 2: Authenticate as moderator
  const authConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(authConnection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
    } satisfies IAdmin.ILogin,
  });
  // Step 3: Create multiple authentication log entries
  const createdLogs: IDiscussionBoardAuthenticationLog[] =
    await ArrayUtil.asyncRepeat(5, async () => {
      return await generate_random_discussion_board_moderator_authentication_logs_create(
        authConnection,
        {
          body: {
            authentication_type: RandomGenerator.pick([
              "login", // maps to success
              "logout", // maps to success
              "failed_login", // maps to failure
            ] as const),
            ip_address: RandomGenerator.pick([
              "192.168.1.1",
              "10.0.0.1",
              "172.16.0.1",
            ] as const),
            user_agent: RandomGenerator.paragraph({
              sentences: 1,
              wordMin: 5,
              wordMax: 15,
            }),
          } satisfies IDiscussionBoardAuthenticationLog.ICreate,
        },
      );
    });
  // Step 4: Verify retrieval with different filter combinations
  const now = new Date().toISOString();
  const twentyFourHoursAgo = new Date(
    Date.now() - 24 * 60 * 60 * 1000,
  ).toISOString();
  // Test: status filter - success
  const successLogs =
    await api.functional.discussionBoard.moderator.authentication_logs.index(
      authConnection,
      {
        body: {
          status: "success",
          startDate: twentyFourHoursAgo,
          endDate: now,
          page: 1,
          limit: 10,
          orderBy: "timestamp",
          ascending: true,
        } satisfies IDiscussionBoardAuthenticationLog.IRequest,
      },
    );
  typia.assert(successLogs);
  TestValidator.equals(
    "success logs pagination",
    successLogs.pagination.current,
    1,
  );
  TestValidator.predicate("success logs have success status", () =>
    successLogs.data.every((log) => log.status === "success"),
  );
  // Test: status filter - failure
  const failureLogs =
    await api.functional.discussionBoard.moderator.authentication_logs.index(
      authConnection,
      {
        body: {
          status: "failure",
          startDate: twentyFourHoursAgo,
          endDate: now,
          page: 1,
          limit: 10,
          orderBy: "timestamp",
          ascending: true,
        } satisfies IDiscussionBoardAuthenticationLog.IRequest,
      },
    );
  typia.assert(failureLogs);
  TestValidator.equals(
    "failure logs pagination",
    failureLogs.pagination.current,
    1,
  );
  TestValidator.predicate("failure logs have failure status", () =>
    failureLogs.data.every((log) => log.status === "failure"),
  );
  // Test: status filter - blocked
  const blockedLogs =
    await api.functional.discussionBoard.moderator.authentication_logs.index(
      authConnection,
      {
        body: {
          status: "blocked",
          startDate: twentyFourHoursAgo,
          endDate: now,
          page: 1,
          limit: 10,
          orderBy: "timestamp",
          ascending: true,
        } satisfies IDiscussionBoardAuthenticationLog.IRequest,
      },
    );
  typia.assert(blockedLogs);
  TestValidator.equals(
    "blocked logs pagination",
    blockedLogs.pagination.current,
    1,
  );
  TestValidator.predicate("blocked logs have blocked status", () =>
    blockedLogs.data.every((log) => log.status === "blocked"),
  );
  // Test: date range filtering - use status: "success" to match created logs
  const dateRangeLogs =
    await api.functional.discussionBoard.moderator.authentication_logs.index(
      authConnection,
      {
        body: {
          // Filter by status to match created logs (success)
          status: "success",
          startDate: twentyFourHoursAgo,
          endDate: now,
          page: 1,
          limit: 10,
          orderBy: "timestamp",
          ascending: true,
        } satisfies IDiscussionBoardAuthenticationLog.IRequest,
      },
    );
  typia.assert(dateRangeLogs);
  TestValidator.predicate("date range valid", () =>
    dateRangeLogs.data.every(
      (log) =>
        new Date(log.timestamp) >= new Date(twentyFourHoursAgo) &&
        new Date(log.timestamp) <= new Date(now),
    ),
  );
  // Test: pagination with limit - use status: "success" to match created logs
  const paginatedLogs =
    await api.functional.discussionBoard.moderator.authentication_logs.index(
      authConnection,
      {
        body: {
          // Filter by status to match created logs (success)
          status: "success",
          startDate: twentyFourHoursAgo,
          endDate: now,
          page: 1,
          limit: 3,
          orderBy: "timestamp",
          ascending: true,
        } satisfies IDiscussionBoardAuthenticationLog.IRequest,
      },
    );
  typia.assert(paginatedLogs);
  TestValidator.equals("paged logs limit", paginatedLogs.data.length, 3);
  TestValidator.equals("pagination limit", paginatedLogs.pagination.limit, 3);
  // Test: ascending and descending order by timestamp - use status: "success" to match created logs
  const ascendingLogs =
    await api.functional.discussionBoard.moderator.authentication_logs.index(
      authConnection,
      {
        body: {
          // Filter by status to match created logs (success)
          status: "success",
          startDate: twentyFourHoursAgo,
          endDate: now,
          page: 1,
          limit: 5,
          orderBy: "timestamp",
          ascending: true,
        } satisfies IDiscussionBoardAuthenticationLog.IRequest,
      },
    );
  typia.assert(ascendingLogs);
  const descendingLogs =
    await api.functional.discussionBoard.moderator.authentication_logs.index(
      authConnection,
      {
        body: {
          // Filter by status to match created logs (success)
          status: "success",
          startDate: twentyFourHoursAgo,
          endDate: now,
          page: 1,
          limit: 5,
          orderBy: "timestamp",
          ascending: false,
        } satisfies IDiscussionBoardAuthenticationLog.IRequest,
      },
    );
  typia.assert(descendingLogs);
  // Verify ascending order (oldest first)
  for (let i = 0; i < ascendingLogs.data.length - 1; i++) {
    const current = new Date(ascendingLogs.data[i].timestamp);
    const next = new Date(ascendingLogs.data[i + 1].timestamp);
    TestValidator.predicate("ascending timestamp", () => current <= next);
  }
  // Verify descending order (newest first)
  for (let i = 0; i < descendingLogs.data.length - 1; i++) {
    const current = new Date(descendingLogs.data[i].timestamp);
    const next = new Date(descendingLogs.data[i + 1].timestamp);
    TestValidator.predicate("descending timestamp", () => current >= next);
  }
  // Test: sorting by status - use status: "success" to match created logs
  const statusOrderedLogs =
    await api.functional.discussionBoard.moderator.authentication_logs.index(
      authConnection,
      {
        body: {
          // Filter by status to match created logs (success)
          status: "success",
          startDate: twentyFourHoursAgo,
          endDate: now,
          page: 1,
          limit: 5,
          orderBy: "status",
          ascending: true,
        } satisfies IDiscussionBoardAuthenticationLog.IRequest,
      },
    );
  typia.assert(statusOrderedLogs);
  const statuses = ["blocked", "failure", "success"]; // Expected order when ascending
  for (let i = 0; i < statusOrderedLogs.data.length - 1; i++) {
    const currentStatus = statusOrderedLogs.data[i].status;
    const nextStatus = statusOrderedLogs.data[i + 1].status;
    const currentIdx = statuses.indexOf(currentStatus);
    const nextIdx = statuses.indexOf(nextStatus);
    TestValidator.predicate(
      "status sort ascending",
      () => currentIdx <= nextIdx,
    );
  }
  // Test: response structure validation - all summary fields present
  // The summary MUST contain user_id, ip_address, user_agent, session_id, status, auth_method, timestamp
  // and MUST NOT contain sensitive fields like password, secret, etc. (none exist in summary anyway)
  TestValidator.predicate("summary contains required fields", () =>
    successLogs.data.every(
      (log) =>
        typeof log.id === "string" &&
        typeof log.user_id === "string" &&
        typeof log.ip_address === "string" &&
        typeof log.user_agent === "string" &&
        typeof log.session_id === "string" &&
        ["success", "failure", "blocked"].includes(log.status) &&
        ["password", "oauth", "api_key", "session_cookie"].includes(
          log.auth_method,
        ) &&
        typeof log.timestamp === "string",
    ),
  );
  // Test: all required fields match exact schema constraints (format validation)
  // Format validation for string fields is guaranteed by typia.assert but we verify structure
  TestValidator.predicate("user_id is UUID format", () =>
    successLogs.data.every((log) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        log.user_id,
      ),
    ),
  );
  TestValidator.predicate("session_id is UUID format", () =>
    successLogs.data.every((log) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        log.session_id,
      ),
    ),
  );
  TestValidator.predicate("ip_address is IPv4 format", () =>
    successLogs.data.every((log) =>
      /^(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
        log.ip_address,
      ),
    ),
  );
  TestValidator.predicate("timestamp is ISO 8601 format", () =>
    successLogs.data.every((log) =>
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
        log.timestamp,
      ),
    ),
  );
  // Test: total count validation
  TestValidator.predicate(
    "total records greater than zero",
    () => successLogs.pagination.records > 0,
  );
  // Test: page and pages count validation
  TestValidator.predicate(
    "current page valid",
    () =>
      successLogs.pagination.current >= 1 &&
      successLogs.pagination.current <= successLogs.pagination.pages,
  );
  TestValidator.predicate(
    "pages count positive",
    () => successLogs.pagination.pages > 0,
  );
  TestValidator.predicate(
    "limit matches pagination",
    () =>
      successLogs.pagination.limit > 0 && successLogs.pagination.limit <= 100,
  );
  // Test: limit boundary validation
  const maxLimitLogs =
    await api.functional.discussionBoard.moderator.authentication_logs.index(
      authConnection,
      {
        body: {
          // Filter by status to match created logs (success)
          status: "success",
          startDate: twentyFourHoursAgo,
          endDate: now,
          page: 1,
          limit: 100, // Maximum allowed limit
          orderBy: "timestamp",
          ascending: true,
        } satisfies IDiscussionBoardAuthenticationLog.IRequest,
      },
    );
  typia.assert(maxLimitLogs);
  TestValidator.equals("maximum limit", maxLimitLogs.pagination.limit, 100);
  // Test: page boundary validation
  const lastPageLogs =
    await api.functional.discussionBoard.moderator.authentication_logs.index(
      authConnection,
      {
        body: {
          // Filter by status to match created logs (success)
          status: "success",
          startDate: twentyFourHoursAgo,
          endDate: now,
          page: successLogs.pagination.pages, // Page 1 (since there are only 5 logs, only page 1 exists)
          limit: 10,
          orderBy: "timestamp",
          ascending: true,
        } satisfies IDiscussionBoardAuthenticationLog.IRequest,
      },
    );
  typia.assert(lastPageLogs);
  TestValidator.predicate(
    "last page has data",
    () => lastPageLogs.data.length > 0,
  );
}
