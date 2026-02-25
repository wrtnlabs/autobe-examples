import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSuperAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_session_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // Test with default pagination (page: 1, limit: 10)
  const response1 =
    await api.functional.discussionBoard.superAdmin.sessions.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSuperAdminSession.IRequest,
      },
    );
  typia.assert(response1);
  // Validate pagination metadata
  TestValidator.equals("current page is 1", response1.pagination.current, 1);
  TestValidator.equals("limit is 10", response1.pagination.limit, 10);
  TestValidator.predicate(
    "records count is non-negative",
    response1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response1.pagination.pages >= 0,
  );
  // Test with page 2 and limit 5
  const response2 =
    await api.functional.discussionBoard.superAdmin.sessions.index(
      superAdminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardSuperAdminSession.IRequest,
      },
    );
  typia.assert(response2);
  TestValidator.equals("current page is 2", response2.pagination.current, 2);
  TestValidator.equals("limit is 5", response2.pagination.limit, 5);
  // Test with page beyond available data
  const response3 =
    await api.functional.discussionBoard.superAdmin.sessions.index(
      superAdminConnection,
      {
        body: {
          page: 999,
          limit: 10,
        } satisfies IDiscussionBoardSuperAdminSession.IRequest,
      },
    );
  typia.assert(response3);
  // Should return empty data array when page is beyond available data
  TestValidator.equals(
    "empty data array for beyond page",
    response3.data.length,
    0,
  );
  // Test with minimum limit (1)
  const response4 =
    await api.functional.discussionBoard.superAdmin.sessions.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardSuperAdminSession.IRequest,
      },
    );
  typia.assert(response4);
  TestValidator.equals("limit is 1", response4.pagination.limit, 1);
  TestValidator.predicate(
    "data has at most 1 record",
    response4.data.length <= 1,
  );
  // Test with maximum limit (100)
  const response5 =
    await api.functional.discussionBoard.superAdmin.sessions.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardSuperAdminSession.IRequest,
      },
    );
  typia.assert(response5);
  TestValidator.equals("limit is 100", response5.pagination.limit, 100);
  TestValidator.predicate(
    "data length matches pagination",
    response5.data.length <= 100,
  );
  // Test pagination calculation correctness
  if (response5.pagination.records > 0) {
    const expectedPages = Math.ceil(
      response5.pagination.records / response5.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation correct",
      response5.pagination.pages,
      expectedPages,
    );
  }
}
