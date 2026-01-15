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
export async function test_api_authentication_logs_filtered_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  // Create admin account
  const adminJoinResponse = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IAdmin.IJoin,
  });
  typia.assert(adminJoinResponse);
  // Use the same connection (already authorized by join)
  // Create multiple authentication log entries with different statuses
  // We'll create 3 entries for each status to verify filtering works with multiple entries
  const successLogs: IDiscussionBoardAuthenticationLog[] = [];
  const failureLogs: IDiscussionBoardAuthenticationLog[] = [];
  const blockedLogs: IDiscussionBoardAuthenticationLog[] = [];
  // Create 3 success logs
  for (let i = 0; i < 3; i++) {
    const log =
      await generate_random_discussion_board_moderator_authentication_logs_create(
        adminConnection,
        {
          body: {
            authentication_type: "login",
            ip_address: typia.random<string & tags.Format<"ipv4">>(),
            user_agent: RandomGenerator.paragraph(),
          } satisfies IDiscussionBoardAuthenticationLog.ICreate,
        },
      );
    successLogs.push(log);
  }
  // Create 3 failure logs
  for (let i = 0; i < 3; i++) {
    const log =
      await generate_random_discussion_board_moderator_authentication_logs_create(
        adminConnection,
        {
          body: {
            authentication_type: "failed login",
            ip_address: typia.random<string & tags.Format<"ipv4">>(),
            user_agent: RandomGenerator.paragraph(),
          } satisfies IDiscussionBoardAuthenticationLog.ICreate,
        },
      );
    failureLogs.push(log);
  }
  // Create 3 blocked logs
  for (let i = 0; i < 3; i++) {
    const log =
      await generate_random_discussion_board_moderator_authentication_logs_create(
        adminConnection,
        {
          body: {
            authentication_type: "blocked login",
            ip_address: typia.random<string & tags.Format<"ipv4">>(),
            user_agent: RandomGenerator.paragraph(),
          } satisfies IDiscussionBoardAuthenticationLog.ICreate,
        },
      );
    blockedLogs.push(log);
  }
  // Get now timestamp for testing range
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 3600000);
  // Test filtering by 'success' status
  const successResponse =
    await api.functional.discussionBoard.moderator.authentication_logs.index(
      adminConnection,
      {
        body: {
          status: "success",
          startDate: now.toISOString(),
          endDate: oneHourLater.toISOString(),
          page: 1,
          limit: 100,
          orderBy: "timestamp",
          ascending: false,
        } satisfies IDiscussionBoardAuthenticationLog.IRequest,
      },
    );
  typia.assert(successResponse);
  TestValidator.equals(
    "only success logs returned",
    successResponse.data.length,
    3,
  );
  TestValidator.predicate("all entries are success", () =>
    successResponse.data.every((entry) => entry.status === "success"),
  );
  // Test filtering by 'failure' status
  const failureResponse =
    await api.functional.discussionBoard.moderator.authentication_logs.index(
      adminConnection,
      {
        body: {
          status: "failure",
          startDate: now.toISOString(),
          endDate: oneHourLater.toISOString(),
          page: 1,
          limit: 100,
          orderBy: "timestamp",
          ascending: false,
        } satisfies IDiscussionBoardAuthenticationLog.IRequest,
      },
    );
  typia.assert(failureResponse);
  TestValidator.equals(
    "only failure logs returned",
    failureResponse.data.length,
    3,
  );
  TestValidator.predicate("all entries are failure", () =>
    failureResponse.data.every((entry) => entry.status === "failure"),
  );
  // Test filtering by 'blocked' status
  const blockedResponse =
    await api.functional.discussionBoard.moderator.authentication_logs.index(
      adminConnection,
      {
        body: {
          status: "blocked",
          startDate: now.toISOString(),
          endDate: oneHourLater.toISOString(),
          page: 1,
          limit: 100,
          orderBy: "timestamp",
          ascending: false,
        } satisfies IDiscussionBoardAuthenticationLog.IRequest,
      },
    );
  typia.assert(blockedResponse);
  TestValidator.equals(
    "only blocked logs returned",
    blockedResponse.data.length,
    3,
  );
  TestValidator.predicate("all entries are blocked", () =>
    blockedResponse.data.every((entry) => entry.status === "blocked"),
  );
}
