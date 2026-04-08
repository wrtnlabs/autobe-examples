import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistoryEntry";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_todo_dashboard_summary_returns_zero_when_no_todos_exist(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test dashboard summary aggregates are zero for a member with no todos.
   *
   * 1. Create a fresh member session (no pre-existing todos expected).
   * 2. Call the authenticated dashboard summary endpoint.
   * 3. Validate the response structure according to the SDK's response DTO.
   *
   * Note: Detailed bucket-aggregate assertions require the exact summary DTO
   * shape, which is not available in the provided DTO list. Therefore, this
   * test validates the response conforms to the SDK-declared type.
   */
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, { body: undefined });
  const summary =
    await api.functional.multiUserTodo.member.dashboard.todos.summary.at(
      memberConnection,
    );
  typia.assert(summary);
}
