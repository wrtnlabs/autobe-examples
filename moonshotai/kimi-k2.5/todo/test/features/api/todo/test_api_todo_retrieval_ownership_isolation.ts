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
/**
 * Test that todo items are properly isolated between members.
 *
 * This test validates the business rule that members can only access their own
 * todos, ensuring data privacy and ownership enforcement in the todo app. When
 * a member attempts to retrieve a todo item that belongs to another member, the
 * system should return a 404 Not Found error rather than exposing the data.
 *
 * Test workflow:
 *
 * 1. Create and authenticate first member (todo creator)
 * 2. Create a todo item as the first member
 * 3. Create and authenticate second member (different user)
 * 4. Attempt to retrieve the first member's todo using the second member's
 *    credentials
 * 5. Verify that the system returns 404 Not Found, confirming ownership isolation
 */
export async function test_api_todo_retrieval_ownership_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate first member (todo creator)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {});
  typia.assert(member1);
  // Step 2: Create a todo item as first member
  const todo = await api.functional.todoApp.member.todos.create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // Step 3: Create and authenticate second member (different user attempting access)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {});
  typia.assert(member2);
  // Step 4: Verify that member2 cannot retrieve member1's todo
  // The system should return 404 Not Found to prevent information leakage
  await TestValidator.error(
    "different member should not access another member's todo",
    async () => {
      await api.functional.todoApp.member.todos.at(member2Connection, {
        todoId: todo.id,
      });
    },
  );
}
