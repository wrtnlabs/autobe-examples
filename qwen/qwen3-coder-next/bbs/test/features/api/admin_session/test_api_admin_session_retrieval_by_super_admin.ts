import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_session_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJwt: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.discussionBoard.auth.admin.join(superAdminConnection, {
      body: typia.random<IDiscussionBoardAdmin.IJoin>(),
    });
  superAdminConnection.headers = {
    ...superAdminConnection.headers,
    Authorization: `Bearer ${superAdminJwt.token.access}`,
  };
  // Step 2: Create another admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJwt: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.discussionBoard.auth.admin.join(adminConnection, {
      body: typia.random<IDiscussionBoardAdmin.IJoin>(),
    });
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${adminJwt.token.access}`,
  };
  // Step 3: Super admin retrieves the admin session
  const session = await api.functional.discussionBoard.admin.admin.sessions.at(
    superAdminConnection,
    {
      sessionId: RandomGenerator.alphaNumeric(8),
    },
  );
  typia.assert(session);
}
