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

export async function test_api_todo_creation_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Prepare todo creation data with all optional fields
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const inputTitle = RandomGenerator.paragraph({ sentences: 1 });
  const inputDescription = RandomGenerator.content({ paragraphs: 2 });
  const inputStartedAt = now.toISOString();
  const inputDueAt = nextWeek.toISOString();
  // 3. Create todo with all fields populated
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: inputTitle,
        description: inputDescription,
        started_at: inputStartedAt,
        due_at: inputDueAt,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 4. Validate all input fields are correctly saved
  TestValidator.equals("title matches", todo.title, inputTitle);
  TestValidator.equals(
    "description matches",
    todo.description,
    inputDescription,
  );
  TestValidator.equals("started_at matches", todo.started_at, inputStartedAt);
  TestValidator.equals("due_at matches", todo.due_at, inputDueAt);
  // 5. Verify todo is incomplete by default
  TestValidator.predicate("todo is incomplete", () => todo.completed === false);
  // 6. Validate timestamps are properly set
  TestValidator.predicate("created_at is set", () => todo.created_at !== null);
  TestValidator.predicate("updated_at is set", () => todo.updated_at !== null);
  // 7. Verify member ownership
  TestValidator.equals("member id matches auth", todo.member.id, authResult.id);
  TestValidator.equals(
    "member display_name matches auth",
    todo.member.display_name,
    authResult.display_name,
  );
}
