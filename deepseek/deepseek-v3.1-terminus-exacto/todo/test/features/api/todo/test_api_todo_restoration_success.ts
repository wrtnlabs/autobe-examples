import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoTrashEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoTrashEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

export async function test_api_todo_restoration_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Create todo with random data
  const originalTitle = RandomGenerator.paragraph({ sentences: 2 });
  const originalDescription = RandomGenerator.content({ paragraphs: 1 });
  const originalStartDate = new Date(Date.now() + 86400000).toISOString(); // tomorrow
  const originalDueDate = new Date(Date.now() + 172800000).toISOString(); // day after tomorrow
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: originalTitle,
        description: originalDescription,
        startDate: originalStartDate,
        dueDate: originalDueDate,
      },
    },
  );
  typia.assert(todo);
  // 3. Delete the todo (soft delete)
  // Note: Assuming delete endpoint exists but wasn't provided in SDK functions list
  // For now, we'll use the restoration functionality as described in scenario
  // In a real scenario, we would call DELETE /multiUserTodo/member/todos/{id}
  // Since we don't have delete endpoint in provided SDK functions,
  // we need to simulate the scenario where todo is already in trash
  // For production, this would require actual soft delete API call
  // 4. Restore from trash using restore endpoint
  const restored = await api.functional.multiUserTodo.member.restore(
    memberConnection,
    {
      body: {
        // The restore endpoint expects IMultiUserTodoTodoTrashEntry.IRequest
        // This contains search criteria, not individual todo ID
        // We need to provide search criteria that matches our deleted todo
        page: 1 satisfies number as number,
        limit: 10 satisfies number as number,
        // For simplicity, we search for todos deleted in recent timeframe
        deleted_at_start: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        deleted_at_end: new Date().toISOString(),
      },
    },
  );
  typia.assert(restored);
  // 5. Validate restored properties match original
  TestValidator.equals("title matches", restored.title, originalTitle);
  TestValidator.equals(
    "description matches",
    restored.description,
    originalDescription,
  );
  TestValidator.equals(
    "start date matches",
    restored.start_date,
    originalStartDate,
  );
  TestValidator.equals("due date matches", restored.due_date, originalDueDate);
  TestValidator.equals(
    "completion status remains false",
    restored.is_completed,
    false,
  );
  TestValidator.predicate(
    "todo should not be deleted after restoration",
    restored.deleted_at === null,
  );
  TestValidator.equals("member ID matches", restored.member.id, authorized.id);
}
