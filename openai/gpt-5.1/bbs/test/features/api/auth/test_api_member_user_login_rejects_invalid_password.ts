import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";

/**
 * Validate that member user login rejects an invalid password.
 *
 * Business goal:
 *
 * - Ensure that, for an existing discussion board member user, the login endpoint
 *   does not authenticate the user when an incorrect password is provided,
 *   while still allowing subsequent successful logins with the correct
 *   password.
 *
 * Scenario steps:
 *
 * 1. Register a new member user via POST /auth/memberUser/join with a known email
 *    and password.
 * 2. Attempt to log in using the same email but an incorrect password while
 *    providing valid href/referrer context.
 * 3. Verify that the login attempt fails (throws an error) and no
 *    IDiscussionBoardMemberuser.IAuthorized payload is returned.
 * 4. Perform a new login attempt with the correct password and verify it succeeds,
 *    demonstrating that failed attempts do not corrupt the account lifecycle or
 *    prevent future successful logins.
 */
export async function test_api_member_user_login_rejects_invalid_password(
  connection: api.IConnection,
) {
  // 1. Prepare deterministic but realistic test data
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const correctPassword: string = RandomGenerator.alphaNumeric(16);
  const wrongPassword: string = `${correctPassword}!`; // guaranteed different
  const displayName: string = RandomGenerator.name(2);
  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  // 2. Register a new member user (join)
  const joined: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        email,
        password: correctPassword,
        displayName,
        bio: null,
        location: null,
        ip: null,
        href,
        referrer,
      } satisfies IDiscussionBoardMemberUserJoin.IRequest,
    });
  typia.assert(joined);

  // Capture baseline lifecycle and token information
  const originalToken: IAuthorizationToken = joined.token;
  typia.assert(originalToken);

  // 3. Attempt login with wrong password and expect failure
  await TestValidator.error(
    "member login rejects invalid password",
    async () => {
      await api.functional.auth.memberUser.login(connection, {
        body: {
          email,
          password: wrongPassword,
          ip: null,
          href,
          referrer,
        } satisfies IDiscussionBoardMemberUserLogin.IRequest,
      });
    },
  );

  // 4. Attempt login again with correct password; expect success
  const relogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        email,
        password: correctPassword,
        ip: null,
        href,
        referrer,
      } satisfies IDiscussionBoardMemberUserLogin.IRequest,
    });
  typia.assert(relogin);
  typia.assert(relogin.token);

  // 4-1. Validate that identity fields remain consistent
  TestValidator.equals(
    "email remains consistent across join and relogin",
    relogin.email,
    joined.email,
  );
  TestValidator.equals(
    "account_status remains consistent across join and relogin",
    relogin.account_status,
    joined.account_status,
  );
  TestValidator.equals(
    "closed_by_admin remains consistent across join and relogin",
    relogin.closed_by_admin,
    joined.closed_by_admin,
  );

  // 4-2. Validate that a new access token has been issued after relogin
  TestValidator.notEquals(
    "relogin issues a different access token from original join",
    relogin.token.access,
    originalToken.access,
  );
}
