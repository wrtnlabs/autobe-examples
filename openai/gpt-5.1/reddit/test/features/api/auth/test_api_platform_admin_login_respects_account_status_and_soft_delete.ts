import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that platform admin login preserves account status and soft deletion
 * semantics for active administrators created through the join endpoint.
 *
 * Business flow (rewritten to match available APIs):
 *
 * 1. Register a new platform administrator using POST /auth/platformAdmin/join.
 * 2. Verify that the returned IAuthorized payload represents an active,
 *    login-allowed admin (accountStatus.isLoginAllowed === true) with deletedAt
 *    unset (null/undefined).
 * 3. Authenticate the same admin using POST /auth/platformAdmin/login with correct
 *    identifier (email) and password.
 * 4. Assert that the login response returns another IAuthorized payload for the
 *    same admin id and that accountStatus and deletedAt semantics are
 *    consistent between join and login.
 * 5. Perform an additional login call to ensure subsequent logins for an active,
 *    non-deleted admin continue to succeed.
 */
export async function test_api_platform_admin_login_respects_account_status_and_soft_delete(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator via join
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password = RandomGenerator.alphaNumeric(16);
  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const joinBody = {
    username: RandomGenerator.name(1),
    email,
    password,
    displayName: RandomGenerator.name(),
    href,
    referrer,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const joined: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(joined);

  // Basic sanity checks on join response
  TestValidator.predicate("joined admin id must be non-empty uuid", () => {
    typia.assert<string & tags.Format<"uuid">>(joined.id);
    return true;
  });
  TestValidator.predicate(
    "joined admin deletedAt must be null or undefined (active account)",
    () => joined.deletedAt === null || joined.deletedAt === undefined,
  );
  TestValidator.predicate(
    "joined admin accountStatus must allow login",
    joined.accountStatus.isLoginAllowed === true,
  );

  // 2. Login using email identifier and same password
  const loginHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const loginReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const loginBody = {
    identifier: email,
    password,
    href: loginHref,
    referrer: loginReferrer,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const loggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(loggedIn);

  // 3. Validate identity consistency between join and login
  TestValidator.equals(
    "admin id must match between join and login",
    joined.id,
    loggedIn.id,
  );
  TestValidator.equals(
    "admin username must match between join and login",
    joined.username,
    loggedIn.username,
  );
  TestValidator.equals(
    "admin email must match between join and login",
    joined.email,
    loggedIn.email,
  );

  // Account status consistency
  TestValidator.equals(
    "accountStatus.id must match between join and login",
    joined.accountStatus.id,
    loggedIn.accountStatus.id,
  );
  TestValidator.equals(
    "accountStatus.code must match between join and login",
    joined.accountStatus.code,
    loggedIn.accountStatus.code,
  );
  TestValidator.equals(
    "accountStatus.key must match between join and login",
    joined.accountStatus.key,
    loggedIn.accountStatus.key,
  );
  TestValidator.equals(
    "accountStatus.label must match between join and login",
    joined.accountStatus.label,
    loggedIn.accountStatus.label,
  );
  TestValidator.equals(
    "accountStatus.isLoginAllowed must remain true",
    joined.accountStatus.isLoginAllowed,
    loggedIn.accountStatus.isLoginAllowed,
  );

  // deletedAt semantics remain active (null/undefined)
  TestValidator.predicate(
    "logged-in admin deletedAt must be null or undefined (still active)",
    () => loggedIn.deletedAt === null || loggedIn.deletedAt === undefined,
  );

  // 4. Ensure that connection Authorization header behavior does not break login
  //    (we cannot read or mutate headers directly; instead, we just perform
  //    another login call on the same connection and expect success).
  const secondLoginHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const secondLoginReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const secondLoginBody = {
    identifier: email,
    password,
    href: secondLoginHref,
    referrer: secondLoginReferrer,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const secondLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: secondLoginBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(secondLogin);

  TestValidator.equals(
    "second login must still refer to same admin id",
    loggedIn.id,
    secondLogin.id,
  );
  TestValidator.predicate(
    "second login deletedAt must remain null or undefined",
    () => secondLogin.deletedAt === null || secondLogin.deletedAt === undefined,
  );
}
