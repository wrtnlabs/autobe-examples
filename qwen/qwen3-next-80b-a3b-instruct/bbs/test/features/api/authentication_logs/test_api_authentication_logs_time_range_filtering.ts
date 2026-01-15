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
export async function test_api_authentication_logs_time_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin actor via join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Step 2: Authenticate admin for session (passing connection for headers update)
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminAuth.token.access.split(".")[0].toString().substring(4),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IAdmin.ILogin,
  });
  // Step 3: Create multiple authentication logs with timestamps spanning a 24-hour period
  const now = new Date();
  const logEntries: IDiscussionBoardAuthenticationLog.ICreate[] = [];
  // Legacy log (24+ hours ago) - should be excluded in time range query
  const legacyTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const legacyLog =
    await generate_random_discussion_board_moderator_authentication_logs_create(
      adminConnection,
      {
        body: {
          authentication_type: "login",
          ip_address: "192.168.1.1",
          user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        } satisfies IDiscussionBoardAuthenticationLog.ICreate,
      },
    );
  typia.assert(legacyLog);
  // Create 5 logs with timestamps spanning 24 hours
  for (let i = 0; i < 5; i++) {
    const timestamp = new Date(now.getTime() - (20 - i) * 60 * 60 * 1000);
    const logData: IDiscussionBoardAuthenticationLog.ICreate = {
      authentication_type: "login",
      ip_address: `192.168.1.${10 + i}`,
      user_agent: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/${i + 1}0.0.0.1`,
    };
    const createdLog =
      await generate_random_discussion_board_moderator_authentication_logs_create(
        adminConnection,
        { body: logData },
      );
    typia.assert(createdLog);
    logEntries.push(logData);
  }
  // Step 4: Test time range filtering with startDate and endDate
  const startDate = new Date(now.getTime() - 18 * 60 * 60 * 1000); // 18 hours ago
  const endDate = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
  const requestBody: IDiscussionBoardAuthenticationLog.IRequest = {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    page: 1,
    limit: 5,
    orderBy: "timestamp",
    ascending: true,
    status: "success",
  };
  const response =
    await api.functional.discussionBoard.moderator.authentication_logs.index(
      adminConnection,
      { body: requestBody },
    );
  typia.assert(response);
  // Step 5: Validate log entries are within time range (inclusive)
  const withinRangeLogs = response.data;
  TestValidator.equals(
    "pagination limit matches request",
    withinRangeLogs.length,
    requestBody.limit,
  );
  // Convert string timestamps to dates for safe comparison
  const startDateMs = startDate.getTime();
  const endDateMs = endDate.getTime();
  for (const log of withinRangeLogs) {
    const logTs = Date.parse(log.timestamp);
    TestValidator.predicate("log timestamp >= startDate", logTs >= startDateMs);
    TestValidator.predicate("log timestamp <= endDate", logTs <= endDateMs);
  }
  // Step 6: Validate no logs outside range are returned
  TestValidator.predicate(
    "no legacy logs in result",
    withinRangeLogs.every((log) => log.timestamp !== legacyLog.created_at),
  );
  // Step 7: Test ascending order by timestamp
  for (let i = 0; i < withinRangeLogs.length - 1; i++) {
    const currentTs = Date.parse(withinRangeLogs[i].timestamp);
    const nextTs = Date.parse(withinRangeLogs[i + 1].timestamp);
    TestValidator.predicate(
      "ascending order by timestamp",
      currentTs <= nextTs,
    );
  }
  // Step 8: Test descending order
  const descendingRequest: IDiscussionBoardAuthenticationLog.IRequest = {
    ...requestBody,
    ascending: false,
  };
  const descendingResponse =
    await api.functional.discussionBoard.moderator.authentication_logs.index(
      adminConnection,
      { body: descendingRequest },
    );
  typia.assert(descendingResponse);
  for (let i = 0; i < descendingResponse.data.length - 1; i++) {
    const currentTs = Date.parse(descendingResponse.data[i].timestamp);
    const nextTs = Date.parse(descendingResponse.data[i + 1].timestamp);
    TestValidator.predicate(
      "descending order by timestamp",
      currentTs >= nextTs,
    );
  }
  // Step 9: Test pagination - request page 2 with limit=2
  const paginatedRequest: IDiscussionBoardAuthenticationLog.IRequest = {
    ...requestBody,
    page: 2,
    limit: 2,
    status: "success",
  };
  const paginatedResponse =
    await api.functional.discussionBoard.moderator.authentication_logs.index(
      adminConnection,
      { body: paginatedRequest },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "page 2 has correct limit",
    paginatedResponse.data.length,
    2,
  );
  TestValidator.equals(
    "page count matches",
    paginatedResponse.pagination.pages,
    Math.ceil(paginatedResponse.pagination.records / paginatedRequest.limit),
  );
  TestValidator.equals(
    "current page matches",
    paginatedResponse.pagination.current,
    2,
  );
  // Step 10: Test time range with no results
  const noResultsRequest: IDiscussionBoardAuthenticationLog.IRequest = {
    startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    page: 1,
    limit: 5,
    orderBy: "timestamp",
    ascending: true,
    status: "success",
  };
  const noResultsResponse =
    await api.functional.discussionBoard.moderator.authentication_logs.index(
      adminConnection,
      { body: noResultsRequest },
    );
  typia.assert(noResultsResponse);
  TestValidator.equals(
    "no results page",
    noResultsResponse.pagination.records,
    0,
  );
  TestValidator.equals("no results data", noResultsResponse.data.length, 0);
  // Step 11: Test error condition - startDate after endDate
  const invalidRequest: IDiscussionBoardAuthenticationLog.IRequest = {
    startDate: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    endDate: new Date(now.getTime() - 18 * 60 * 60 * 1000).toISOString(), // 18 hours ago
    page: 1,
    limit: 5,
    orderBy: "timestamp",
    ascending: true,
    status: "success",
  };
  await TestValidator.error(
    "should reject startDate after endDate",
    async () => {
      await api.functional.discussionBoard.moderator.authentication_logs.index(
        adminConnection,
        { body: invalidRequest },
      );
    },
  );
}