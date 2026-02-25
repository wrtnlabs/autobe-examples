import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_session_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as super administrator to get authorization credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create a new session by logging in with the super admin credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedSuperAdmin = await authorize_super_admin_login(loginConnection, {
    body: {
      email: superAdmin.email,
      password: "1234" satisfies string,
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  typia.assert(loggedSuperAdmin);
  // Create session-specific connection with authentication
  const sessionConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: loggedSuperAdmin.token.access,
    },
  };
  // 3. Retrieve the session details
  // The API returns session information for the currently authenticated user
  const session =
    await api.functional.discussionBoard.superAdmin.super_admin_sessions.at(
      sessionConnection,
      {
        sessionId: loggedSuperAdmin.id,
      },
    );
  typia.assert(session);
  // 4. Validate session information
  TestValidator.equals("session ID matches", session.id, loggedSuperAdmin.id);
  TestValidator.equals(
    "superAdmin ID matches",
    session.superAdmin.id,
    loggedSuperAdmin.id,
  );
  TestValidator.equals(
    "superAdmin email matches",
    session.superAdmin.email,
    loggedSuperAdmin.email,
  );
  TestValidator.predicate("session active", session.active === true);
  TestValidator.predicate("has access token", session.access_token.length > 0);
  TestValidator.predicate(
    "has refresh token",
    session.refresh_token.length > 0,
  );
}
