import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test banned users list pagination endpoint.
 * 1. Create super administrator account
 * 2. Call banned users endpoint with pagination parameters
 * 3. Validate response structure and pagination metadata
 */
export async function test_api_banned_users_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  // Call banned users endpoint with pagination
  const result: IPageIDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.superAdmin.bans.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          isActive: false,
        } satisfies IDiscussionBoardMember.IRequest,
      },
    );
  // Validate response structure
  typia.assert(result);
  // Validate pagination metadata
  typia.assert(result.pagination);
  TestValidator.equals("page is 1", result.pagination.current, 1);
  TestValidator.equals("limit is 10", result.pagination.limit, 10);
  TestValidator.predicate("has records", result.pagination.records >= 0);
  // Validate data structure
  result.data.forEach((user) => {
    typia.assert(user);
    TestValidator.equals("user is inactive", user.is_active, false);
  });
}
