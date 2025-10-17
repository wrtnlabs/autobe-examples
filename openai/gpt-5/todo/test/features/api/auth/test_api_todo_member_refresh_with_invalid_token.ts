import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMember";
import type { ITodoListTodoMemberJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberJoin";
import type { ITodoListTodoMemberRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberRefresh";

/**
 * Reject tampered refresh token for todoMember.
 *
 * Steps:
 *
 * 1. Register a new member via join to obtain a valid refresh token.
 * 2. Tamper the refresh token by appending a suffix, preserving string shape but
 *    breaking integrity.
 * 3. Call refresh with the tampered token and assert that the API call fails.
 *
 * Notes:
 *
 * - Use only valid DTOs and avoid any type-error testing.
 * - Do not check specific HTTP statuses; only assert an error occurs.
 * - Do not manipulate connection.headers – SDK handles authentication headers.
 */
export async function test_api_todo_member_refresh_with_invalid_token(
  connection: api.IConnection,
) {
  // 1) Register a new member to obtain a refresh token
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ITodoListTodoMemberJoin.ICreate;

  const authorized: ITodoListTodoMember.IAuthorized =
    await api.functional.auth.todoMember.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2) Tamper the refresh token (keep string shape, break integrity)
  const originalRefresh: string = authorized.token.refresh;
  const tamperedRefresh: string = `${originalRefresh}.tampered`;

  TestValidator.notEquals(
    "tampered token must differ from original",
    tamperedRefresh,
    originalRefresh,
  );

  // 3) Refresh with tampered token should fail
  await TestValidator.error(
    "tampered refresh token should be rejected",
    async () => {
      await api.functional.auth.todoMember.refresh(connection, {
        body: {
          refresh_token: tamperedRefresh,
        } satisfies ITodoListTodoMemberRefresh.ICreate,
      });
    },
  );
}
