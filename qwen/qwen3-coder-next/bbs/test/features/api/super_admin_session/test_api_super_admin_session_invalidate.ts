import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_session_invalidate(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account with actor-specific connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const joinBody: IDiscussionBoardSuperAdmin.IJoin =
    typia.random<IDiscussionBoardSuperAdmin.IJoin>();
  const joinResult = await api.functional.discussionBoard.auth.super_admin.join(
    superAdminConnection,
    { body: joinBody },
  );
  typia.assert(joinResult);
  // 2. Login as super admin to establish valid session with actor-specific connection
  const loginBody: IDiscussionBoardSuperAdmin.ILogin =
    typia.random<IDiscussionBoardSuperAdmin.ILogin>();
  const loginResult =
    await api.functional.discussionBoard.auth.super_admin.login(
      superAdminConnection,
      { body: loginBody },
    );
  typia.assert(loginResult);
  // 3. Invalidate current session with actor-specific connection
  const invalidatedSession =
    await api.functional.discussionBoard.superAdmin.sessions.invalidate(
      superAdminConnection,
    );
  typia.assert(invalidatedSession);
  // 4. Verify session is invalidated by testing unauthorized access
  await TestValidator.error(
    "session should be invalid after invalidate",
    async () => {
      await api.functional.discussionBoard.superAdmin.sessions.invalidate(
        superAdminConnection,
      );
    },
  );
}
