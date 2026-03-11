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
import { generate_random_multi_user_todo_member_view_stats_create } from "../../../generate/generate_random_multi_user_todo_member_view_stats_create";
import { prepare_random_multi_user_todo_todo_view_stat } from "../../../prepare/prepare_random_multi_user_todo_todo_view_stat";

/**
 * Validate user successfully records todo list view statistics.
 *
 * 1. Create a new member account for authentication
 * 2. Create list view statistics with view_type: 'list'
 * 3. Verify response contains correct statistical record with null todo_id and proper member context
 */
export async function test_api_todo_view_stats_list_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorizedMember);
  // 2. Create list view statistics
  const viewStat =
    await generate_random_multi_user_todo_member_view_stats_create(
      memberConnection,
      {
        body: {
          view_type: "list",
          multi_user_todo_todo_id: null,
        },
      },
    );
  typia.assert(viewStat);
  // 3. Validate the view statistics record
  TestValidator.equals("view_type must be 'list'", viewStat.view_type, "list");
  TestValidator.equals(
    "todo field must be null for list views",
    viewStat.todo,
    null,
  );
  TestValidator.equals(
    "member.id must match authenticated user",
    viewStat.member.id,
    authorizedMember.id,
  );
  TestValidator.predicate(
    "created_at timestamp must be set",
    () => viewStat.created_at.length > 0,
  );
  TestValidator.predicate("record must have a valid UUID id", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      viewStat.id,
    ),
  );
}
