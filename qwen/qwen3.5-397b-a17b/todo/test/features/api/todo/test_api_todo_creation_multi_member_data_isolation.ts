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

/**
 * Test data isolation and ownership enforcement by having two different members each create todos.
 *
 * This test validates:
 * 1. Each member can create todos independently
 * 2. Todos are correctly associated with their owner's account
 * 3. The member relation in todo responses accurately identifies the owner
 * 4. Complete data isolation between different member accounts
 *
 * Workflow:
 * - Register two distinct members with unique credentials
 * - Each member creates a todo using their authenticated connection
 * - Verify todo ownership matches the creating member
 * - Confirm member IDs and display names are correctly associated
 */
export async function test_api_todo_creation_multi_member_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member connection and register
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMemberAuth = await authorize_member_join(firstMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(firstMemberAuth);
  // 2. First member creates a todo
  const firstTodo = await generate_random_todo_app_member_todos_create(
    firstMemberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(firstTodo);
  // 3. Create second member connection and register
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMemberAuth = await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(secondMemberAuth);
  // 4. Second member creates a todo
  const secondTodo = await generate_random_todo_app_member_todos_create(
    secondMemberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(secondTodo);
  // 5. Validate first todo ownership
  TestValidator.equals(
    "first todo owner ID matches first member",
    firstTodo.member.id,
    firstMemberAuth.id,
  );
  TestValidator.equals(
    "first todo owner display name matches first member",
    firstTodo.member.display_name,
    firstMemberAuth.display_name,
  );
  // 6. Validate second todo ownership
  TestValidator.equals(
    "second todo owner ID matches second member",
    secondTodo.member.id,
    secondMemberAuth.id,
  );
  TestValidator.equals(
    "second todo owner display name matches second member",
    secondTodo.member.display_name,
    secondMemberAuth.display_name,
  );
  // 7. Verify data isolation - members must be different
  TestValidator.notEquals(
    "member IDs are different (data isolation)",
    firstMemberAuth.id,
    secondMemberAuth.id,
  );
  TestValidator.notEquals(
    "todo IDs are different",
    firstTodo.id,
    secondTodo.id,
  );
  // 8. Cross-verify no mixing of ownership
  TestValidator.notEquals(
    "first todo not owned by second member",
    firstTodo.member.id,
    secondMemberAuth.id,
  );
  TestValidator.notEquals(
    "second todo not owned by first member",
    secondTodo.member.id,
    firstMemberAuth.id,
  );
}
