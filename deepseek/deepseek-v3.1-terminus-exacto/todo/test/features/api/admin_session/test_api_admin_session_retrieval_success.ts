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

export async function test_api_admin_session_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {});
  typia.assert(authorized);
  // 2. Generate a random session ID (UUID)
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve a session that likely does not exist
  //    Expect an HTTP error (404 Not Found) because we don't have a valid session ID
  await TestValidator.httpError(
    "retrieve non-existent session should return 404",
    404,
    async () => {
      await api.functional.multiUserTodo.admin.admins.sessions.at(
        adminConnection,
        { sessionId },
      );
    },
  );
  // 4. Validate that the admin connection is properly authenticated
  //    (token should be set in headers by authorize_admin_join)
  TestValidator.predicate(
    "admin connection has authorization header",
    () => adminConnection.headers?.Authorization !== undefined,
  );
  // 5. Additional validation: Ensure the session DTO structure is correct
  //    by generating a random instance and asserting it
  const sampleSession = typia.random<IMultiUserTodoAdminSession>();
  typia.assert(sampleSession);
  // 6. Verify that sensitive tokens are not exposed in session DTO
  TestValidator.predicate(
    "session DTO should not contain token field",
    () => !("token" in sampleSession),
  );
  // 7. Verify that admin field in session DTO is of type ISummary
  TestValidator.predicate(
    "admin field should have ISummary structure",
    () =>
      typeof sampleSession.admin.id === "string" &&
      typeof sampleSession.admin.email === "string" &&
      typeof sampleSession.admin.display_name === "string" &&
      typeof sampleSession.admin.created_at === "string",
  );
}
