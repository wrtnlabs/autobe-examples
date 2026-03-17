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

export async function test_api_todo_retrieval_success_with_full_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorizedMember);
  // Update memberConnection headers with authorization token
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: authorizedMember.token.access,
  };
  // 2. Create todo using utility function with various fields
  const createdTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(createdTodo);
  // 3. Retrieve the todo using GET endpoint
  const retrievedTodo = await api.functional.todoApp.member.todos.at(
    memberConnection,
    {
      todoId: createdTodo.id,
    },
  );
  typia.assert(retrievedTodo);
  // 4. Validate all fields match the creation data
  TestValidator.equals("todo id matches", retrievedTodo.id, createdTodo.id);
  TestValidator.equals(
    "todo title matches",
    retrievedTodo.title,
    createdTodo.title,
  );
  TestValidator.equals(
    "todo description matches",
    retrievedTodo.description,
    createdTodo.description,
  );
  TestValidator.equals(
    "todo start_date matches",
    retrievedTodo.start_date,
    createdTodo.start_date,
  );
  TestValidator.equals(
    "todo due_date matches",
    retrievedTodo.due_date,
    createdTodo.due_date,
  );
  // 5. Verify completion status is false by default
  TestValidator.equals(
    "completed false by default",
    retrievedTodo.completed,
    false,
  );
  // 6. Check that timestamps are present (typia.assert already validates these)
  // 7. Validate member summary shows correct owner information
  TestValidator.equals(
    "member id matches",
    retrievedTodo.member.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "member email matches",
    retrievedTodo.member.email,
    authorizedMember.email,
  );
  TestValidator.equals(
    "member display_name matches",
    retrievedTodo.member.display_name,
    authorizedMember.display_name,
  );
  TestValidator.equals(
    "member deleted_at matches",
    retrievedTodo.member.deleted_at,
    authorizedMember.deleted_at,
  );
  // 8. Ensure response includes all expected properties
  // typia.assert already validates all properties exist and match types
}
