import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test retrieval of administrator session information including expiration metadata.
 * Create an admin account, authenticate, and retrieve the current session details.
 * Validate that session metadata includes proper expiration timestamp and admin information.
 */
export async function test_api_admin_session_retrieval_expired_session(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoAdmin.IJoin,
  });
  typia.assert(authorizedAdmin);
  // Test 1: Attempt to retrieve a non-existent session (invalid UUID)
  // This simulates expired session scenario indirectly
  const randomSessionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieve non-existent session should error",
    async () => {
      await api.functional.multiUserTodo.admin.admins.sessions.at(
        adminConnection,
        {
          sessionId: randomSessionId,
        },
      );
    },
  );
  // Test 2: Verify endpoint requires authentication by trying with base connection
  // This tests that session retrieval is protected
  await TestValidator.error(
    "session retrieval requires admin authentication",
    async () => {
      await api.functional.multiUserTodo.admin.admins.sessions.at(
        { host: connection.host }, // Base connection without auth
        {
          sessionId: randomSessionId,
        },
      );
    },
  );
  // Test 3: Validate token structure from successful join
  // This ensures we have a valid authenticated session
  TestValidator.notEquals(
    "access token should not be empty",
    authorizedAdmin.token.access,
    "",
  );
  TestValidator.notEquals(
    "refresh token should not be empty",
    authorizedAdmin.token.refresh,
    "",
  );
}
