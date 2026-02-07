import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBansAdminLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansAdminLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBansAdminLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBansAdminLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_ban_admin_logs_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      admin_role_id: "admin-role-id",
      member_id: "member-id",
      display_name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Test: Retrieve ban admin logs with empty filter
  const logs = await api.functional.discussionBoard.admin.bans.admin_logs.patch(
    adminConnection,
    {
      body: {},
    },
  );
  typia.assert(logs);
  // 3. Validate: Check response structure
  TestValidator.equals("pagination exists", logs.pagination.current, 1);
  TestValidator.equals("pagination limit", logs.pagination.limit, 10);
  TestValidator.predicate("has records count", logs.pagination.records >= 0);
  TestValidator.predicate("has pages count", logs.pagination.pages >= 0);
  TestValidator.equals("data is array", Array.isArray(logs.data), true);
}
