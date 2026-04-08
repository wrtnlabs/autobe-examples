import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test restoring a non-existent todo from trash returns 404 Not Found.
 *
 * Validates that attempting to restore a todo that does not exist in the system is properly rejected with a 404 Not Found error. This ensures the API correctly validates todo existence before attempting restoration and does not expose information about non-existent resources.
 *
 * The test authenticates as a member, generates a random UUID that has no corresponding todo record, and attempts to restore it. The system must reject this request with a 404 error rather than creating a new todo or returning success.
 *
 * 1. Member authenticates via join endpoint.
 * 2. Generate a random UUID that does not correspond to any existing todo.
 * 3. Attempt to restore the non-existent todo from trash.
 * 4. Validate that the operation fails with 404 Not Found error.
 */
export async function test_api_todo_restore_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  // 2. Generate a non-existent todo UUID
  const nonExistentTodoId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to restore non-existent todo - should fail with 404
  await TestValidator.httpError("restore non-existent todo", 404, async () => {
    await api.functional.todoApp.member.trash.restore(memberConnection, {
      todoId: nonExistentTodoId,
    });
  });
}
