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
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_creation_with_only_title(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult: ITodoAppMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(authResult);
  // 2. Create todo with only title (minimal valid todo)
  const title: string & tags.MinLength<1> & tags.MaxLength<500> =
    RandomGenerator.paragraph({ sentences: 3 });
  const todo: ITodoAppTodo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Validate todo structure - business logic checks
  TestValidator.equals("title matches input", todo.title, title);
  TestValidator.predicate("description is null", todo.description === null);
  TestValidator.predicate("start_date is null", todo.start_date === null);
  TestValidator.predicate("due_date is null", todo.due_date === null);
  TestValidator.predicate(
    "completed defaults to false",
    todo.completed === false,
  );
  // 4. Validate system-managed fields
  TestValidator.predicate(
    "has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      todo.id,
    ),
  );
  // 5. Validate author ownership
  TestValidator.equals(
    "author id matches member id",
    todo.author.id,
    authResult.id,
  );
  TestValidator.predicate(
    "author has display name",
    todo.author.display_name.length > 0,
  );
}
