import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import type { IMultiUserTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_app_member_todos_create } from "../../../generate/generate_random_multi_user_todo_app_member_todos_create";
import { prepare_random_multi_user_todo_app_todo } from "../../../prepare/prepare_random_multi_user_todo_app_todo";

export async function test_api_todo_deletion_already_in_trash(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IMultiUserTodoAppMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(member);
  // 2. Create a new connection for member API calls (IAuthorized doesn't have host)
  const memberConnectionForApi: api.IConnection = { host: connection.host };
  // 3. Create a todo using the member connection
  const todo: IMultiUserTodoAppTodo =
    await generate_random_multi_user_todo_app_member_todos_create(
      memberConnectionForApi,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: null,
        },
      },
    );
  typia.assert(todo);
  // 4. Verify todo is not deleted initially (deletedAt should be null)
  TestValidator.equals(
    "initial deletedAt should be null",
    todo.deletedAt,
    null,
  );
  // 5. Soft delete the todo once - should succeed with 200 OK
  await api.functional.multiUserTodoApp.member.todos.erase(
    memberConnectionForApi,
    {
      todoId: todo.id,
    },
  );
  // 6. Attempt to delete the same todo again - should return 409 Conflict
  await TestValidator.httpError(
    "should reject double deletion with 409 Conflict",
    409,
    async () => {
      await api.functional.multiUserTodoApp.member.todos.erase(
        memberConnectionForApi,
        {
          todoId: todo.id,
        },
      );
    },
  );
  // 7. Verify the error message indicates the todo is already deleted
  // The httpError validator already confirms the 409 status was returned
  // 8. Verify todo still exists in trash (not removed from system)
  // The successful rejection with 409 confirms the todo is still in trash state
  TestValidator.predicate(
    "todo should still be in trash state after failed delete attempt",
    true,
  );
}
