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
/**
 * Test successful logout from current session only (scope: 'current').
 *
 * A member authenticates by joining, then logs out from the current device
 * session. Validates that:
 *
 * 1. The logout operation succeeds with scope 'current'
 * 2. Only 1 session is affected (affectedSessionsCount = 1)
 * 3. The access token is invalidated (accessTokenInvalidated = true)
 * 4. A valid logout timestamp is returned.
 *
 * This simulates a user logging out from a single device while keeping other
 * active sessions intact.
 */
export async function test_api_member_logout_current_session(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as a member
  // Using authorize_member_join utility to create authenticated session
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Logout from the current session only
  // Using generate_random_todo_app_member_auth_members_logout with scope 'current'
  const logoutResult =
    await generate_random_todo_app_member_auth_members_logout(
      memberConnection,
      {
        body: { scope: "current" } satisfies ITodoAppMemberLogout.ICreate,
      },
    );
  // Step 3: Validate the response structure using typia
  typia.assert(logoutResult);
  // Step 4: Validate logout scope is 'current'
  TestValidator.equals(
    "logout scope is current",
    logoutResult.scope,
    "current",
  );
  // Step 5: Validate only 1 session was affected
  TestValidator.equals(
    "affected sessions count equals 1",
    logoutResult.affectedSessionsCount,
    1,
  );
  // Step 6: Validate access token was invalidated
  TestValidator.equals(
    "access token invalidated is true",
    logoutResult.accessTokenInvalidated,
    true,
  );
  // Step 7: Validate logout timestamp is valid ISO 8601 format
  TestValidator.predicate("logoutAt is valid ISO 8601 timestamp", () => {
    const date = new Date(logoutResult.logoutAt);
    return !isNaN(date.getTime());
  });
}
