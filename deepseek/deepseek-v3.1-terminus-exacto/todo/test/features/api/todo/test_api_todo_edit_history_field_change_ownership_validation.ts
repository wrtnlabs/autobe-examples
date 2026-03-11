import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistory";
import type { IMultiUserTodoEditHistoryFieldChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryFieldChange";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
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

/**
 * Test ownership validation when accessing field changes.
 *
 * 1. Create two members: memberA and memberB
 * 2. Attempt to access field change endpoint with memberB's connection using random IDs
 * 3. Verify system rejects access to resources that don't exist/aren't owned by memberB
 * This validates hierarchical ownership checks where field changes belong to edit histories,
 * which belong to specific todos owned by authenticated members.
 */
export async function test_api_todo_edit_history_field_change_ownership_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member (memberA)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Create a todo with memberA to establish ownership
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Create second member (memberB)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberB);
  // 4. Generate random UUIDs to simulate attempting to access non-existent/unauthorized resources
  const randomTodoId = typia.random<string & tags.Format<"uuid">>();
  const randomHistoryId = typia.random<string & tags.Format<"uuid">>();
  const randomFieldChangeId = typia.random<string & tags.Format<"uuid">>();
  // 5. Attempt to access field change endpoint with memberB's connection
  // Should fail because resources don't exist or aren't owned by memberB
  await TestValidator.error(
    "memberB cannot access field changes of resources not owned by them",
    async () => {
      await api.functional.multiUserTodo.member.todos.edit_histories.field_changes.at(
        memberBConnection,
        {
          todoId: randomTodoId,
          historyId: randomHistoryId,
          fieldChangeId: randomFieldChangeId,
        },
      );
    },
  );
}
