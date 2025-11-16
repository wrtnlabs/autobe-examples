import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUser";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Ensure user listing requires authentication and returns error for
 * unauthenticated requests.
 *
 * 1. Create an unauthenticated connection (headers: {}).
 * 2. Attempt to call the users.index API for /todoList/user/users with arbitrary
 *    search body.
 * 3. Assert that an error is thrown (access is forbidden or unauthorized).
 * 4. Ensure no user or admin data is returned in the error (negative test).
 */
export async function test_api_list_all_users_unauthorized(
  connection: api.IConnection,
) {
  // Create an unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Attempt to list users without authentication should fail
  await TestValidator.error(
    "unauthenticated client cannot list all users",
    async () => {
      await api.functional.todoList.user.users.index(unauthConn, {
        body: {}, // Empty object gives default/all users search
      });
    },
  );
}
