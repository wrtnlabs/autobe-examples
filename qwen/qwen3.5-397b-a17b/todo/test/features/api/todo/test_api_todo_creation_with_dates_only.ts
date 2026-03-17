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

export async function test_api_todo_creation_with_dates_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member using join endpoint
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(auth);
  // 2. Prepare specific date values for testing date handling
  const startDate = new Date(Date.now() + 86400000); // Tomorrow
  const dueDate = new Date(Date.now() + 604800000); // 7 days from now
  // 3. Create todo with title and dates only (description left empty/null)
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: null,
        started_at: startDate.toISOString(),
        due_at: dueDate.toISOString(),
      },
    },
  );
  typia.assert(todo);
  // 4. Validate date fields are stored correctly in ISO 8601 format
  TestValidator.predicate("started_at is valid ISO 8601 date", () => {
    return (
      todo.started_at !== null && !isNaN(new Date(todo.started_at).getTime())
    );
  });
  TestValidator.predicate("due_at is valid ISO 8601 date", () => {
    return todo.due_at !== null && !isNaN(new Date(todo.due_at).getTime());
  });
  // 5. Validate completed is false by default for new todos
  TestValidator.equals("completed is false by default", todo.completed, false);
  // 6. Validate member ownership is correctly established
  TestValidator.equals(
    "member id matches authenticated user",
    todo.member.id,
    auth.id,
  );
  TestValidator.equals(
    "member display_name matches",
    todo.member.display_name,
    auth.display_name,
  );
  // 7. Validate date values match the input values exactly
  TestValidator.equals(
    "started_at matches input",
    todo.started_at,
    startDate.toISOString(),
  );
  TestValidator.equals(
    "due_at matches input",
    todo.due_at,
    dueDate.toISOString(),
  );
}
