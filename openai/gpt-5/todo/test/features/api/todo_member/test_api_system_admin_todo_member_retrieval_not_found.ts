import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemAdmin";
import type { ITodoListTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMember";

/**
 * Validate privacy-safe not-found behavior for admin member retrieval.
 *
 * Business goal:
 *
 * - When a system administrator queries a Todo member by a valid-format UUID that
 *   does not exist (or is not accessible), the API must fail without leaking
 *   existence details. We validate that an error occurs (no status code
 *   assertion).
 *
 * Steps
 *
 * 1. Join as system admin (authorization is auto-handled by SDK).
 * 2. Generate a valid, random UUID that is extremely unlikely to exist.
 * 3. Attempt to GET /todoList/systemAdmin/todoMembers/{todoMemberId} with that
 *    UUID.
 * 4. Expect an error (privacy-safe not-available outcome). Do not inspect status
 *    code or message.
 */
export async function test_api_system_admin_todo_member_retrieval_not_found(
  connection: api.IConnection,
) {
  // 1) Join as system admin
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const authorized = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email,
      password: `P${RandomGenerator.alphaNumeric(10)}!`,
    } satisfies ITodoListSystemAdmin.ICreate,
  });
  typia.assert(authorized);

  // 2) Prepare a valid non-existent UUID (extremely low collision probability)
  const missingMemberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3) Call target endpoint with the missing ID
  // 4) Validate that an error occurs (no specific status code assertion)
  await TestValidator.error(
    "system admin retrieval with non-existent todoMemberId must fail",
    async () => {
      await api.functional.todoList.systemAdmin.todoMembers.at(connection, {
        todoMemberId: missingMemberId,
      });
    },
  );
}
