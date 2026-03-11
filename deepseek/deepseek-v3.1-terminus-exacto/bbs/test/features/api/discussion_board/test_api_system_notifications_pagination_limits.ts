import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test pagination functionality for system notifications by verifying that the system correctly handles
 * different page sizes (within the 1-100 limit) and page numbers. Validate pagination metadata including
 * total record count, current page position, and total pages available.
 */
export async function test_api_system_notifications_pagination_limits(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Test valid pagination scenarios
  const testCases = [
    { page: 1, limit: 1 },
    { page: 1, limit: 50 },
    { page: 1, limit: 100 },
    { page: 2, limit: 25 },
  ] as const;
  for (const testCase of testCases) {
    const response =
      await api.functional.discussionBoard.admin.system_notifications.index(
        adminConnection,
        {
          body: {
            page: testCase.page,
            limit: testCase.limit,
          } satisfies IDiscussionBoardSystemNotification.IRequest,
        },
      );
    typia.assert(response);
    // Validate pagination metadata
    TestValidator.predicate(
      `page ${testCase.page} limit ${testCase.limit} - pagination exists`,
      response.pagination !== undefined,
    );
    TestValidator.equals(
      `page ${testCase.page} limit ${testCase.limit} - current page`,
      response.pagination.current,
      testCase.page,
    );
    TestValidator.equals(
      `page ${testCase.page} limit ${testCase.limit} - limit`,
      response.pagination.limit,
      testCase.limit,
    );
    TestValidator.predicate(
      `page ${testCase.page} limit ${testCase.limit} - records non-negative`,
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      `page ${testCase.page} limit ${testCase.limit} - pages non-negative`,
      response.pagination.pages >= 0,
    );
    // Validate data array
    TestValidator.predicate(
      `page ${testCase.page} limit ${testCase.limit} - data array exists`,
      Array.isArray(response.data),
    );
    TestValidator.predicate(
      `page ${testCase.page} limit ${testCase.limit} - data length within limit`,
      response.data.length <= testCase.limit,
    );
  }
  // 3. Test boundary conditions
  // Test very high page number (should return empty data if beyond total pages)
  const highPageResponse =
    await api.functional.discussionBoard.admin.system_notifications.index(
      adminConnection,
      {
        body: {
          page: 999999,
          limit: 10,
        } satisfies IDiscussionBoardSystemNotification.IRequest,
      },
    );
  typia.assert(highPageResponse);
  TestValidator.predicate(
    "high page returns valid pagination",
    highPageResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "high page returns empty data when beyond total pages",
    highPageResponse.data.length === 0 ||
      highPageResponse.pagination.current <= highPageResponse.pagination.pages,
  );
  // Test limit boundaries
  const limitOneResponse =
    await api.functional.discussionBoard.admin.system_notifications.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardSystemNotification.IRequest,
      },
    );
  typia.assert(limitOneResponse);
  TestValidator.equals(
    "limit 1 returns max 1 item",
    limitOneResponse.pagination.limit,
    1,
  );
  const limitHundredResponse =
    await api.functional.discussionBoard.admin.system_notifications.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardSystemNotification.IRequest,
      },
    );
  typia.assert(limitHundredResponse);
  TestValidator.equals(
    "limit 100 returns max 100 items",
    limitHundredResponse.pagination.limit,
    100,
  );
  // Test without pagination parameters (should use defaults)
  const defaultResponse =
    await api.functional.discussionBoard.admin.system_notifications.index(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardSystemNotification.IRequest,
      },
    );
  typia.assert(defaultResponse);
  TestValidator.predicate(
    "default response has pagination",
    defaultResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "default response has data array",
    Array.isArray(defaultResponse.data),
  );
}
