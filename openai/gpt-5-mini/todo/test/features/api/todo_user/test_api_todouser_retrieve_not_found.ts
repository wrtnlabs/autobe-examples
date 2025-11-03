import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_todouser_retrieve_not_found(
  connection: api.IConnection,
) {
  /**
   * Verify GET /todoApp/todoUser/todoUsers/{todoUserId} returns 404 when the
   * target user does not exist. The test performs two variants:
   *
   * 1. Unauthenticated request should yield 404
   * 2. Authenticated request (after user join) should also yield 404 for a
   *    non-existent id
   *
   * Steps:
   *
   * - Generate a valid but non-existent UUID
   * - Call endpoint unauthenticated -> expect 404
   * - Create a fresh account via POST /auth/todoUser/join (authenticated caller)
   * - Call endpoint authenticated -> expect 404
   */

  // 1) Generate a fresh UUID (syntactically valid, assumed non-existent)
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();

  // 2) Unauthenticated request: create an unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Expect 404 for unauthenticated attempt
  await TestValidator.httpError(
    "unauthenticated GET non-existent todoUser should return 404",
    404,
    async () => {
      await api.functional.todoApp.todoUser.todoUsers.at(unauthConn, {
        todoUserId: nonExistentId,
      });
    },
  );

  // 3) Create a fresh todoUser to obtain authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoUser.ICreate;

  const authorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 4) Authenticated request should also return 404 for the same non-existent id
  await TestValidator.httpError(
    "authenticated GET non-existent todoUser should return 404",
    404,
    async () => {
      await api.functional.todoApp.todoUser.todoUsers.at(connection, {
        todoUserId: nonExistentId,
      });
    },
  );

  // End of test - both unauthenticated and authenticated callers receive 404
}
