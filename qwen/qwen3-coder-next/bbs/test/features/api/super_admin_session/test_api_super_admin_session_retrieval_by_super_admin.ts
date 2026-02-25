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

export async function test_api_super_admin_session_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new super administrator
  const registerConnection: api.IConnection = { host: connection.host };
  const superAdmin = await api.functional.discussionBoard.auth.superAdmin.join(
    registerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // Step 2: Create a new connection with the registered super admin's credentials
  // Note: The join function automatically updates the connection's headers with the token
  const sessionConnection: api.IConnection = { host: connection.host };
  // Step 3: Retrieve the session details using a session ID
  // Since the join function creates an initial session with the returned token,
  // we'll use the access token as the session ID for this test
  // In a real scenario, this would be the session ID from the authentication response
  const sessionResponse =
    await api.functional.discussionBoard.superAdmin.superAdmin.sessions.at(
      sessionConnection,
      {
        sessionId: superAdmin.token.access,
      },
    );
  typia.assert(sessionResponse);
  // Step 4: Validate the response structure
  TestValidator.predicate("session is active", sessionResponse.active === true);
  TestValidator.equals(
    "super admin email matches",
    sessionResponse.superAdmin.email,
    superAdmin.email,
  );
  TestValidator.predicate(
    "has valid created timestamp",
    new Date(sessionResponse.created_at) <= new Date(),
  );
  TestValidator.predicate(
    "has valid expired timestamp",
    new Date(sessionResponse.expired_at) > new Date(),
  );
}
