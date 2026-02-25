import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_session_filter_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connections for authentication (which creates sessions)
  const adminConnection1: api.IConnection = { host: connection.host };
  const adminConnection2: api.IConnection = { host: connection.host };
  // Authenticate as two different admin users to create sessions
  const admin1 = await api.functional.discussionBoard.auth.admin.join(
    adminConnection1,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(admin1);
  const admin2 = await api.functional.discussionBoard.auth.admin.join(
    adminConnection2,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(admin2);
  // Verify admin1 sessions - filter by admin1's ID
  const admin1Sessions =
    await api.functional.discussionBoard.admin.admin_sessions.index(
      connection,
      {
        body: {
          adminId: admin1.id,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(admin1Sessions);
  // Verify that only admin1's sessions are returned
  admin1Sessions.data.forEach((session) => {
    TestValidator.equals("session admin matches", session.admin.id, admin1.id);
  });
  // Verify pagination structure is correct
  TestValidator.predicate(
    "has pagination",
    admin1Sessions.pagination !== undefined,
  );
  TestValidator.equals(
    "pagination current page",
    admin1Sessions.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", admin1Sessions.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records >= 0",
    admin1Sessions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    admin1Sessions.pagination.pages >= 0,
  );
  // Verify admin2 sessions - filter by admin2's ID
  const admin2Sessions =
    await api.functional.discussionBoard.admin.admin_sessions.index(
      connection,
      {
        body: {
          adminId: admin2.id,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(admin2Sessions);
  // Verify pagination structure for admin2 sessions
  TestValidator.predicate(
    "admin2 has pagination",
    admin2Sessions.pagination !== undefined,
  );
  TestValidator.equals(
    "admin2 pagination current page",
    admin2Sessions.pagination.current,
    1,
  );
  TestValidator.equals(
    "admin2 pagination limit",
    admin2Sessions.pagination.limit,
    10,
  );
}
