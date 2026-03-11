import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppDashboard";
import type { ITodoAppEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEditHistoryEntry";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_dashboard_retrieval_with_default_parameters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member with proper email constraints
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMemberSession.IJoin,
  });
  typia.assert(member);
  // 2. Retrieve dashboard (only available endpoint)
  const dashboard =
    await api.functional.todoApp.member.dashboard.at(memberConnection);
  typia.assert(dashboard);
  // 3. Validate dashboard structure
  TestValidator.predicate(
    "dashboard has todos array",
    Array.isArray(dashboard.todos),
  );
  TestValidator.predicate(
    "dashboard has totalTodos count",
    typeof dashboard.totalTodos === "number",
  );
  TestValidator.predicate(
    "dashboard has completedTodos count",
    typeof dashboard.completedTodos === "number",
  );
  TestValidator.predicate(
    "dashboard has recentEditHistory array",
    Array.isArray(dashboard.recentEditHistory),
  );
  // 4. Validate each todo structure
  for (const todo of dashboard.todos) {
    TestValidator.equals("todo has id", typeof todo.id, "string");
    TestValidator.equals("todo has title", typeof todo.title, "string");
    TestValidator.equals(
      "todo has is_complete",
      typeof todo.is_complete,
      "boolean",
    );
    TestValidator.equals(
      "todo has created_at",
      typeof todo.created_at,
      "string",
    );
    TestValidator.predicate(
      "todo has valid user",
      todo.user &&
        typeof todo.user.id === "string" &&
        typeof todo.user.email === "string",
    );
    TestValidator.equals(
      "edit_history_entries_count is number",
      typeof todo.edit_history_entries_count,
      "number",
    );
  }
}
