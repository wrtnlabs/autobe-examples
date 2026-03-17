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

export async function test_api_todo_creation_with_complete_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration with all join credentials
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IMultiUserTodoAppMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IMultiUserTodoAppMember.IJoin,
    });
  typia.assert(authorized);
  // 2. Create authenticated connection using the token from join response
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  // 3. Create todo with all available fields
  const todo: IMultiUserTodoAppTodo =
    await generate_random_multi_user_todo_app_member_todos_create(
      authenticatedConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          startDate: typia.random<string & tags.Format<"date-time">>(),
          dueDate: typia.random<string & tags.Format<"date-time">>(),
        },
      },
    );
  typia.assert(todo);
  // 4. Validate todo structure and business logic
  TestValidator.predicate("title is present", todo.title.length > 0);
  TestValidator.predicate("description is present", todo.description !== null);
  TestValidator.predicate("start date is present", todo.startDate !== null);
  TestValidator.predicate("due date is present", todo.dueDate !== null);
  TestValidator.equals(
    "todo is incomplete by default",
    todo.isCompleted,
    false,
  );
  TestValidator.equals(
    "created_at is date-time",
    todo.createdAt !== undefined,
    true,
  );
  TestValidator.equals(
    "updated_at is date-time",
    todo.updatedAt !== undefined,
    true,
  );
  // 5. Validate user profile is returned
  TestValidator.equals("user id is present", todo.user.id !== undefined, true);
  TestValidator.equals(
    "user email is present",
    todo.user.email !== undefined,
    true,
  );
  TestValidator.equals(
    "user created_at is present",
    todo.user.createdAt !== undefined,
    true,
  );
}