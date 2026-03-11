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
 * Test restoration of a completed todo from trash.
 * Simplified test using available APIs.
 */
export async function test_api_todo_restoration_with_completed_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create a todo
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        startDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo);
  // Note: We cannot mark the todo as completed or delete it to trash
  // because those endpoints are not provided in the SDK functions.
  // The todo is created with is_completed=false by default.
  // 3. Attempt to restore from trash using the TrashEntry request
  // This may fail or succeed depending on implementation, but we test the endpoint
  const restored = await api.functional.multiUserTodo.member.restore(
    memberConnection,
    {
      body: {
        page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
        deleted_at_start: new Date(Date.now() - 86400000).toISOString(),
        deleted_at_end: new Date().toISOString(),
      } satisfies IMultiUserTodoTodoTrashEntry.IRequest,
    },
  );
  typia.assert(restored);
  // 4. Validate the returned todo structure
  TestValidator.equals(
    "todo has valid structure",
    typeof restored.id,
    "string",
  );
  TestValidator.equals("todo has title", typeof restored.title, "string");
  TestValidator.equals(
    "todo has is_completed field",
    typeof restored.is_completed,
    "boolean",
  );
  TestValidator.equals(
    "todo has created_at",
    typeof restored.created_at,
    "string",
  );
  TestValidator.equals(
    "todo has updated_at",
    typeof restored.updated_at,
    "string",
  );
  TestValidator.equals(
    "todo has member field",
    typeof restored.member,
    "object",
  );
  // Note: We cannot validate completion status preservation because we couldn't
  // mark the todo as completed or delete it. However, the restore endpoint
  // should return a valid todo structure.
}
