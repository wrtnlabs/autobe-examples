import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";

/**
 * Validate successful member user login with valid credentials.
 *
 * Business flow:
 *
 * 1. Register a new member user via /auth/memberUser/join with unique email,
 *    password, displayName, and session context (href/referrer, optional ip).
 * 2. Immediately call /auth/memberUser/login with the same email/password and
 *    realistic href/referrer so that authentication succeeds.
 * 3. Assert that both responses conform to IDiscussionBoardMemberuser.IAuthorized.
 * 4. Verify that identity fields (id, email, display_name, bio, location) are
 *    consistent between join and login responses.
 * 5. Assert that the embedded token (IAuthorizationToken) has non-empty access and
 *    refresh strings, and valid date-time formatted expiration fields.
 * 6. Check that last_login_at in the login response is not null/undefined and is
 *    greater than or equal to created_at, and that lifecycle flags like
 *    account_status and closed_by_admin reflect an active, open account.
 */
export async function test_api_member_user_login_success_with_valid_credentials(
  connection: api.IConnection,
) {
  // 1. Register a new member user with unique email and password
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphaNumeric(16);

  const joinBody = {
    email,
    password,
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.paragraph({ sentences: 2 }),
    ip: "203.0.113.10",
    href: "https://discussion.example.com/signup",
    referrer: "https://discussion.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const joined: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // Basic identity assertions on join result
  TestValidator.equals(
    "joined email should match request email",
    joined.email,
    email,
  );
  TestValidator.equals(
    "joined display_name should match request displayName",
    joined.display_name,
    joinBody.displayName,
  );

  // Lifecycle expectations for a freshly created account
  TestValidator.equals(
    "newly joined account must not be soft-deleted",
    joined.deleted_at,
    null,
  );
  TestValidator.equals(
    "newly joined account must not be closed",
    joined.closed_at,
    null,
  );
  TestValidator.equals(
    "newly joined account must not be closed by admin",
    joined.closed_by_admin,
    false,
  );

  // Token structure validation for join response
  typia.assert<IAuthorizationToken>(joined.token);
  TestValidator.predicate(
    "join token.access must be non-empty",
    joined.token.access.length > 0,
  );
  TestValidator.predicate(
    "join token.refresh must be non-empty",
    joined.token.refresh.length > 0,
  );

  // 2. Login using the same credentials
  const loginBody = {
    email,
    password,
    ip: "203.0.113.11",
    href: "https://discussion.example.com/login",
    referrer: "https://discussion.example.com/home",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const loggedIn: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedIn);

  // 3. Identity consistency between join and login
  TestValidator.equals("login id must equal join id", loggedIn.id, joined.id);
  TestValidator.equals(
    "login email must equal join email",
    loggedIn.email,
    joined.email,
  );
  TestValidator.equals(
    "login display_name must equal join display_name",
    loggedIn.display_name,
    joined.display_name,
  );
  TestValidator.equals(
    "login bio must equal join bio",
    loggedIn.bio ?? null,
    joined.bio ?? null,
  );
  TestValidator.equals(
    "login location must equal join location",
    loggedIn.location ?? null,
    joined.location ?? null,
  );

  // 4. Token validation for login response
  typia.assert<IAuthorizationToken>(loggedIn.token);
  TestValidator.predicate(
    "login token.access must be non-empty",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "login token.refresh must be non-empty",
    loggedIn.token.refresh.length > 0,
  );

  // 5. Lifecycle and timestamp expectations
  TestValidator.equals(
    "account_status must remain consistent between join and login",
    loggedIn.account_status,
    joined.account_status,
  );
  TestValidator.equals(
    "closed_by_admin must remain false after login",
    loggedIn.closed_by_admin,
    false,
  );
  TestValidator.equals(
    "deleted_at must remain null after login",
    loggedIn.deleted_at,
    null,
  );
  TestValidator.equals(
    "closed_at must remain null after login",
    loggedIn.closed_at,
    null,
  );

  // last_login_at should be set (non-null) after a successful login
  TestValidator.predicate(
    "last_login_at must be present after successful login",
    loggedIn.last_login_at !== null && loggedIn.last_login_at !== undefined,
  );

  // Compare last_login_at and created_at as ISO date-time strings
  const createdAtMillis = Date.parse(joined.created_at);
  const lastLoginMillis =
    loggedIn.last_login_at !== null && loggedIn.last_login_at !== undefined
      ? Date.parse(loggedIn.last_login_at)
      : NaN;

  TestValidator.predicate(
    "last_login_at must be >= created_at",
    !Number.isNaN(createdAtMillis) &&
      !Number.isNaN(lastLoginMillis) &&
      lastLoginMillis >= createdAtMillis,
  );
}
