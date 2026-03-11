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

export async function test_api_view_stats_list_view_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as a member user
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(member);
  // Create list view statistics entry (no todo association)
  const viewStat =
    await generate_random_multi_user_todo_member_view_stats_create(
      memberConnection,
      {
        body: {
          view_type: "list",
          multi_user_todo_todo_id: null,
        } satisfies IMultiUserTodoTodoViewStat.ICreate,
      },
    );
  typia.assert(viewStat);
  // Retrieve the list view statistics details
  const retrievedViewStat =
    await api.functional.multiUserTodo.member.view_stats.at(memberConnection, {
      viewStatId: viewStat.id,
    });
  typia.assert(retrievedViewStat);
  // Validate the response
  TestValidator.equals("view statistics ID", retrievedViewStat.id, viewStat.id);
  TestValidator.equals(
    "view type should be list",
    retrievedViewStat.view_type,
    "list",
  );
  TestValidator.equals(
    "member ID should match",
    retrievedViewStat.member.id,
    member.id,
  );
  TestValidator.equals(
    "todo should be null for list view",
    retrievedViewStat.todo,
    null,
  );
  TestValidator.predicate(
    "created_at should be valid",
    retrievedViewStat.created_at.length > 0,
  );
}
