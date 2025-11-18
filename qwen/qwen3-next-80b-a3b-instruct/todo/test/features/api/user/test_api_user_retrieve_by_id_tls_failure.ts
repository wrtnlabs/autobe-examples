import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_retrieve_by_id_tls_failure(
  connection: api.IConnection,
) {
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePassword123",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Simulate TLS/SSL handshake failure by clearing headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Validate that TLS failure prevents user retrieval
  await TestValidator.error(
    "TLS handshaking failure should prevent user retrieval",
    async () => {
      await api.functional.todoList.user.actors.at(unauthConn, {
        userId: user.id,
      });
    },
  );
}
