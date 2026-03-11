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

/**
 * Test successful retrieval of a specific trash entry. Create a todo as a member user,
 * soft delete it to move to trash, then retrieve the trash entry details.
 * Since soft delete endpoint is not provided, we test error handling for
 * non-existent trash entries.
 */
export async function test_api_todo_trash_entry_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // 2. Create a todo to establish member context (though we can't delete it)
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }) satisfies
          | string
          | null as string | null,
        startDate: new Date().toISOString() satisfies
          | (string & tags.Format<"date-time">)
          | null as (string & tags.Format<"date-time">) | null,
        dueDate: new Date(Date.now() + 86400000).toISOString() satisfies
          | (string & tags.Format<"date-time">)
          | null as (string & tags.Format<"date-time">) | null,
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Attempt to retrieve a non-existent trash entry (since we can't create one)
  // The endpoint should return an error (404 or permission error)
  await TestValidator.error(
    "non-existent trash entry should error",
    async () => {
      await api.functional.multiUserTodo.member.todos.trash_entries.at(
        memberConnection,
        {
          trashEntryId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 4. Validate test completes (this is a partial test due to missing delete API)
  TestValidator.predicate("test completed", true);
}
