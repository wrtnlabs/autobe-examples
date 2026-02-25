import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_session_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account via join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Login to create session - this establishes an admin session
  const loginOutput = await api.functional.discussionBoard.auth.admin.login(
    adminConnection,
    {
      body: {
        email: adminConnection.headers?.Authorization
          ? "dummy@example.com"
          : "",
        password: "",
      } satisfies IDiscussionBoardAdmin.ILogin,
    },
  );
  typia.assert(loginOutput);
  // 3. Retrieve session information using the session ID from login output
  const session = await api.functional.discussionBoard.admin.admin.sessions.at(
    adminConnection,
    {
      sessionId: loginOutput.token.access,
    },
  );
  typia.assert(session);
  // 4. Validate session structure
  TestValidator.equals("session has ID", typeof session.id, "string");
  TestValidator.equals(
    "session has access token",
    typeof session.access_token,
    "string",
  );
  TestValidator.equals("session has admin info", !!session.admin, true);
  TestValidator.equals("session has IP address", typeof session.ip, "string");
  TestValidator.equals(
    "session has user agent",
    typeof session.user_agent,
    "string",
  );
}
