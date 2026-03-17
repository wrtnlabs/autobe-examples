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

export async function test_api_todo_restore_already_restored(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  typia.assert(authorizedMember);
  // Test error handling for restore endpoint
  // With only the restore API available, we can test error responses
  // Test 1: Try to restore a non-existent todo - should fail
  const nonExistentTodoId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "restore non-existent todo should fail",
    async () => {
      await api.functional.todoApp.member.todos.restore(memberConnection, {
        todoId: nonExistentTodoId,
      });
    },
  );
  // Test 2: Try to restore with invalid UUID format
  const invalidTodoId = RandomGenerator.alphaNumeric(10);
  await TestValidator.error(
    "restore with invalid UUID should fail",
    async () => {
      await api.functional.todoApp.member.todos.restore(memberConnection, {
        todoId: invalidTodoId,
      });
    },
  );
  // Note: Without create/delete APIs, we cannot test 409 or 410 errors
  // as described in the scenario, but at least we validate the
  // endpoint exists and handles invalid inputs.
}
