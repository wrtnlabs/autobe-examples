import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserLogin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";

export async function test_api_admin_user_login_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin user via join endpoint
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  // password must satisfy Format<"password">, use random string
  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const joinBody = {
    email,
    password,
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    // use realistic URLs for href and referrer
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const joinedAdmin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<IDiscussionBoardAdminuser.IAuthorized>(joinedAdmin);

  // 2. Login using same email and password
  const loginBody = {
    email,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const loggedInAdmin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: loginBody,
    });
  typia.assert<IDiscussionBoardAdminuser.IAuthorized>(loggedInAdmin);

  // 3. Basic identity consistency checks
  TestValidator.equals(
    "admin id must be consistent between join and first login",
    joinedAdmin.id,
    loggedInAdmin.id,
  );
  TestValidator.equals(
    "admin email must match input email on join",
    joinedAdmin.email,
    email,
  );
  TestValidator.equals(
    "admin email must be consistent between join and first login",
    loggedInAdmin.email,
    joinedAdmin.email,
  );
  TestValidator.equals(
    "display name must be consistent between join and first login",
    loggedInAdmin.displayName,
    joinedAdmin.displayName,
  );
  TestValidator.equals(
    "status must be consistent between join and first login",
    loggedInAdmin.status,
    joinedAdmin.status,
  );
  TestValidator.equals(
    "role must be consistent between join and first login",
    loggedInAdmin.role,
    joinedAdmin.role,
  );
  TestValidator.equals(
    "emailVerified flag must be consistent between join and first login",
    loggedInAdmin.emailVerified,
    joinedAdmin.emailVerified,
  );

  // 4. Token-level validations for join and first login
  const joinedToken: IAuthorizationToken = joinedAdmin.token;
  const loggedInToken: IAuthorizationToken = loggedInAdmin.token;

  TestValidator.predicate(
    "joined access token must be non-empty",
    joinedToken.access.length > 0,
  );
  TestValidator.predicate(
    "joined refresh token must be non-empty",
    joinedToken.refresh.length > 0,
  );
  TestValidator.predicate(
    "login access token must be non-empty",
    loggedInToken.access.length > 0,
  );
  TestValidator.predicate(
    "login refresh token must be non-empty",
    loggedInToken.refresh.length > 0,
  );

  // Expect new tokens on login vs join
  TestValidator.notEquals(
    "access token from login should differ from join access token",
    loggedInToken.access,
    joinedToken.access,
  );
  TestValidator.notEquals(
    "refresh token from login should differ from join refresh token",
    loggedInToken.refresh,
    joinedToken.refresh,
  );

  // 5. Re-login to confirm repeated logins continue to work and issue fresh tokens
  const loginBody2 = {
    email,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const loggedInAdmin2: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: loginBody2,
    });
  typia.assert<IDiscussionBoardAdminuser.IAuthorized>(loggedInAdmin2);

  const loggedInToken2: IAuthorizationToken = loggedInAdmin2.token;

  // Identity consistency across all three responses
  TestValidator.equals(
    "admin id must be consistent across join and both logins",
    loggedInAdmin2.id,
    joinedAdmin.id,
  );
  TestValidator.equals(
    "admin email must be consistent across join and both logins",
    loggedInAdmin2.email,
    joinedAdmin.email,
  );
  TestValidator.equals(
    "display name must be consistent across join and both logins",
    loggedInAdmin2.displayName,
    joinedAdmin.displayName,
  );

  // Token rotation expectations
  TestValidator.notEquals(
    "second login access token should differ from first login access token",
    loggedInToken2.access,
    loggedInToken.access,
  );
  TestValidator.notEquals(
    "second login access token should differ from join access token",
    loggedInToken2.access,
    joinedToken.access,
  );

  // Optional check: refresh tokens should also rotate
  TestValidator.notEquals(
    "second login refresh token should differ from first login refresh token",
    loggedInToken2.refresh,
    loggedInToken.refresh,
  );
}
