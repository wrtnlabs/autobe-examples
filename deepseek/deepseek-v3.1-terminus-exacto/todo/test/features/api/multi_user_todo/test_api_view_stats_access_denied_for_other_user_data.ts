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

export async function test_api_view_stats_access_denied_for_other_user_data(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberAAuth);
  // Step 2: Create view statistics for Member A
  const viewStatA =
    await generate_random_multi_user_todo_member_view_stats_create(
      memberAConnection,
      {
        body: {
          view_type: "list",
        } satisfies IMultiUserTodoTodoViewStat.ICreate,
      },
    );
  typia.assert(viewStatA);
  // Verify Member A can access their own view statistics
  const memberAViewStat =
    await api.functional.multiUserTodo.member.view_stats.at(memberAConnection, {
      viewStatId: viewStatA.id,
    });
  typia.assert(memberAViewStat);
  TestValidator.equals(
    "Member A should access their own view statistics",
    memberAViewStat.id,
    viewStatA.id,
  );
  // Step 3: Create and authenticate Member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberBAuth);
  // Step 4: Attempt to access Member A's view statistics using Member B's connection
  await TestValidator.httpError(
    "Member B should not access Member A's view statistics",
    404,
    async () => {
      await api.functional.multiUserTodo.member.view_stats.at(
        memberBConnection,
        {
          viewStatId: viewStatA.id,
        },
      );
    },
  );
}
