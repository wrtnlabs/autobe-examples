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

export async function test_api_view_stats_detail_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Authenticate as member
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberAuth);
  // Create a todo
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo);
  // Create view statistics entry for the todo
  const viewStat =
    await generate_random_multi_user_todo_member_view_stats_create(
      memberConnection,
      {
        body: {
          view_type: "detail" as const,
          multi_user_todo_todo_id: todo.id,
        } satisfies IMultiUserTodoTodoViewStat.ICreate,
      },
    );
  typia.assert(viewStat);
  // Retrieve the view statistics details
  const retrievedViewStat =
    await api.functional.multiUserTodo.member.view_stats.at(memberConnection, {
      viewStatId: viewStat.id,
    });
  typia.assert(retrievedViewStat);
  // Validate response fields
  TestValidator.equals(
    "view stat ID matches",
    retrievedViewStat.id,
    viewStat.id,
  );
  TestValidator.equals(
    "member ID matches",
    retrievedViewStat.member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "member email matches",
    retrievedViewStat.member.email,
    memberAuth.email,
  );
  TestValidator.equals(
    "member display name matches",
    retrievedViewStat.member.display_name,
    memberAuth.display_name,
  );
  TestValidator.equals("todo ID matches", retrievedViewStat.todo?.id, todo.id);
  TestValidator.equals(
    "todo title matches",
    retrievedViewStat.todo?.title,
    todo.title,
  );
  TestValidator.equals(
    "view type is detail",
    retrievedViewStat.view_type,
    "detail",
  );
  TestValidator.predicate(
    "created at is valid date",
    new Date(retrievedViewStat.created_at).getTime() > 0,
  );
}
