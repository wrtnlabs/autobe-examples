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
export async function test_api_todo_creation_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Step 2: Prepare future due date (7 days from now)
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);
  // Step 3: Create todo with all optional fields populated
  const todo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: "Complete project documentation",
        description:
          "Write comprehensive documentation for the API endpoints including request/response examples and authentication flows",
        priority: "high",
        due_date: futureDate.toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  // Step 4: Validate response structure and system-generated fields
  typia.assert(todo);
  // Step 5: Verify member association - todo should be linked to authenticated member
  TestValidator.equals(
    "todo member id matches authenticated member",
    todo.member.id,
    member.id,
  );
}
