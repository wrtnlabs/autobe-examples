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

export async function test_api_todo_creation_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication via authorize_member_join utility function
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
  // 2. Create todo with partial fields (title and description only, no dates)
  const title = RandomGenerator.paragraph({ sentences: 3 });
  const description = RandomGenerator.paragraph({ sentences: 2 });
  const todo: IMultiUserTodoAppTodo =
    await api.functional.multiUserTodoApp.member.todos.create(
      memberConnection,
      {
        body: {
          title,
          description,
        } satisfies IMultiUserTodoAppTodo.ICreate,
      },
    );
  typia.assert(todo);
  // 3. Validate todo response
  TestValidator.equals("title matches input", todo.title, title);
  TestValidator.equals(
    "description matches input",
    todo.description,
    description,
  );
  TestValidator.equals("start date is null", todo.startDate, null);
  TestValidator.equals("due date is null", todo.dueDate, null);
  TestValidator.equals("is completed is false", todo.isCompleted, false);
  TestValidator.equals(
    "todo belongs to authenticated member",
    todo.user.id,
    member.id,
  );
  TestValidator.equals(
    "created at is valid date-time",
    typeof todo.createdAt,
    "string",
  );
  TestValidator.equals(
    "updated at is valid date-time",
    typeof todo.updatedAt,
    "string",
  );
  TestValidator.equals(
    "deleted at is null (active todo)",
    todo.deletedAt,
    null,
  );
}