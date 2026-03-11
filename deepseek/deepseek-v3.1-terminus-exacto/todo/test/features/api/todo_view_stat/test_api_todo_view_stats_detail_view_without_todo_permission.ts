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
 * ユーザーが自分のものでないTodoの詳細ビュースタットを作成できないことを検証する。
 * 1. 最初のメンバーアカウントを作成・認証する
 * 2. 最初のユーザーがTodoを作成する
 * 3. 2番目のメンバーアカウントを作成・認証する
 * 4. 2番目のユーザーが最初のユーザーのTodo IDを使って詳細ビュースタットを作成しようと試みる
 * 5. アクセス権限エラーが発生することを検証する
 */
export async function test_api_todo_view_stats_detail_view_without_todo_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. 最初のメンバーアカウントを作成・認証する
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(firstMember);
  // 2. 最初のユーザーがTodoを作成する
  const todo = await generate_random_multi_user_todo_member_todos_create(
    firstMemberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. 2番目のメンバーアカウントを作成・認証する
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMember = await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(secondMember);
  // 4. 2番目のユーザーが最初のユーザーのTodo IDを使って詳細ビュースタットを作成しようと試みる
  await TestValidator.error(
    "should reject creating view stat for todo not owned by the user",
    async () => {
      await generate_random_multi_user_todo_member_view_stats_create(
        secondMemberConnection,
        {
          body: {
            view_type: "detail",
            multi_user_todo_todo_id: todo.id,
          } satisfies IMultiUserTodoTodoViewStat.ICreate,
        },
      );
    },
  );
}
