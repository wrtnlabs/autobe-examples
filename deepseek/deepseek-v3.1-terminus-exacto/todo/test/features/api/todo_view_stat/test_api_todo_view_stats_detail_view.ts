import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoViewStat";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { generate_random_multi_user_todo_member_view_stats_create } from "../../../generate/generate_random_multi_user_todo_member_view_stats_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";
import { prepare_random_multi_user_todo_todo_view_stat } from "../../../prepare/prepare_random_multi_user_todo_todo_view_stat";

/**
 * Test detailed view statistics recording for todo items.
 *
 * 1. Create a member account and authenticate
 * 2. Create a todo item for detailed view statistics
 * 3. Record a detailed view statistics (view_type: 'detail') for the todo
 * 4. Validate the response contains correct statistics with view_type 'detail',
 *    matching todo.id, matching member.id, and created_at timestamp
 * 5. Verify users can only record detailed view stats for their own todos
 */
export async function test_api_todo_view_stats_detail_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create a todo item using utility function
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        startDate: new Date().toISOString() satisfies
          | (string & tags.Format<"date-time">)
          | null
          | undefined,
        dueDate: new Date(Date.now() + 86400000).toISOString() satisfies
          | (string & tags.Format<"date-time">)
          | null
          | undefined,
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Record detailed view statistics using utility function
  const viewStat =
    await generate_random_multi_user_todo_member_view_stats_create(
      memberConnection,
      {
        body: {
          view_type: "detail" satisfies "detail" as "detail",
          multi_user_todo_todo_id: todo.id satisfies string &
            tags.Format<"uuid">,
        } satisfies IMultiUserTodoTodoViewStat.ICreate,
      },
    );
  typia.assert(viewStat);
  // 4. Validate the response
  TestValidator.equals(
    "view_type should be 'detail'",
    viewStat.view_type,
    "detail",
  );
  TestValidator.equals(
    "todo.id should match created todo",
    viewStat.todo?.id,
    todo.id,
  );
  TestValidator.predicate(
    "todo should not be null for detail view",
    viewStat.todo !== null,
  );
  TestValidator.equals(
    "member.id should match authenticated member",
    viewStat.member.id,
    authorized.id,
  );
  TestValidator.predicate(
    "created_at should be set",
    viewStat.created_at !== "" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(viewStat.created_at),
  );
  // 5. Verify users can only record detail view stats for their own todos
  // Create another member to attempt accessing the first member's todo
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherAuthorized = await authorize_member_join(otherMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(otherAuthorized);
  // Attempt to create view stats for other member's todo should fail
  await TestValidator.error(
    "should not allow creating view stats for other member's todo",
    async () => {
      await generate_random_multi_user_todo_member_view_stats_create(
        otherMemberConnection,
        {
          body: {
            view_type: "detail" satisfies "detail" as "detail",
            multi_user_todo_todo_id: todo.id satisfies string &
              tags.Format<"uuid">,
          } satisfies IMultiUserTodoTodoViewStat.ICreate,
        },
      );
    },
  );
}
