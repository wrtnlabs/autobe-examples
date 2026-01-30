import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_todo_creation_minimal(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection and authenticate
  // Create isolated connection for member actor to avoid auth state pollution
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Step 2: Generate valid todo title and create todo with minimal fields
  // Only provide title - all other fields should use defaults or be null
  const todoTitle = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<200>
  >();
  const createdTodo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: todoTitle,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  // Step 3: Validate complete response structure
  typia.assert(createdTodo);
  // Step 4: Validate member association and id existence
  // Verify member association
  TestValidator.equals(
    "todo is associated with authenticated member",
    createdTodo.member.id,
    member.id,
  );
  TestValidator.equals(
    "member email matches",
    createdTodo.member.email,
    member.email,
  );
  // Verify system-generated id exists
  TestValidator.predicate("id is valid uuid", createdTodo.id.length > 0);
}
