import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberLogout } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberLogout";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { prepare_random_todo_app_member_logout } from "../../../prepare/prepare_random_todo_app_member_logout";
import { generate_random_todo_app_member_auth_members_logout } from "../../../generate/generate_random_todo_app_member_auth_members_logout";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_logout_all_sessions(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member-specific connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      nickname: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://example.com/todo/register",
      referrer: "https://example.com",
    } satisfies ITodoAppMember.IJoin,
  });
  // Step 2: Logout from all sessions using scope 'all'
  const logoutResult: ITodoAppMemberLogout =
    await api.functional.todoApp.member.auth.members.logout(memberConnection, {
      body: {
        scope: "all",
      } satisfies ITodoAppMemberLogout.ICreate,
    });
  typia.assert(logoutResult);
  // Step 3: Validate logout response matches expected behavior
  TestValidator.equals("logout scope is 'all'", logoutResult.scope, "all");
  TestValidator.predicate(
    "affected sessions count is at least 1",
    logoutResult.affectedSessionsCount >= 1,
  );
  TestValidator.equals(
    "access token is invalidated",
    logoutResult.accessTokenInvalidated,
    true,
  );
  TestValidator.predicate(
    "logout timestamp is valid ISO 8601 string",
    typeof logoutResult.logoutAt === "string",
  );
}
