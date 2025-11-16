import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserLogin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";

export async function test_api_admin_user_login_multiple_successive_logins(
  connection: api.IConnection,
) {
  // 1. Register a new administrative user who will perform multiple logins.
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  // Use a deterministic but strong-looking password string. It must satisfy
  // Format<"password">, but we don't need to randomize it.
  const password: string & tags.Format<"password"> =
    "Adm1n!Passw0rd" as string & tags.Format<"password">;

  const joinHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const joinReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const joinRequestBody = {
    email,
    password,
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: "203.0.113.10",
    href: joinHref,
    referrer: joinReferrer,
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const joinedAdmin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinRequestBody,
    });
  typia.assert<IDiscussionBoardAdminuser.IAuthorized>(joinedAdmin);

  // 2. First login with the same credentials and connection metadata.
  const loginHref1: string & tags.Format<"uri"> = joinHref;
  const loginReferrer1: string & tags.Format<"uri"> = joinReferrer;

  const loginBody1 = {
    email,
    password,
    ip: "203.0.113.10",
    href: loginHref1,
    referrer: loginReferrer1,
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const login1: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: loginBody1,
    });
  typia.assert<IDiscussionBoardAdminuser.IAuthorized>(login1);

  // 3. Second login immediately with the same credentials and connection metadata.
  const loginBody2 = {
    email,
    password,
    ip: "203.0.113.10",
    href: loginHref1,
    referrer: loginReferrer1,
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const login2: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: loginBody2,
    });
  typia.assert<IDiscussionBoardAdminuser.IAuthorized>(login2);

  // 4. Verify that core identity/profile fields remain identical.
  const titleStableProfile1 =
    "admin profile should remain stable across successive logins";

  TestValidator.equals(titleStableProfile1, login1.id, login2.id);
  TestValidator.equals(titleStableProfile1, login1.loginId, login2.loginId);
  TestValidator.equals(
    titleStableProfile1,
    login1.displayName,
    login2.displayName,
  );
  TestValidator.equals(titleStableProfile1, login1.email, login2.email);
  TestValidator.equals(titleStableProfile1, login1.status, login2.status);
  TestValidator.equals(titleStableProfile1, login1.role, login2.role);
  TestValidator.equals(
    "emailVerified flag should stay consistent across logins",
    login1.emailVerified,
    login2.emailVerified,
  );
  TestValidator.equals(
    "createdAt should be the same across repeated logins",
    login1.createdAt,
    login2.createdAt,
  );
  TestValidator.equals(
    "updatedAt should not regress across repeated logins",
    login1.updatedAt,
    login2.updatedAt,
  );

  // 5. Compare token behavior between login1 and login2.
  const token1: IAuthorizationToken = login1.token;
  const token2: IAuthorizationToken = login2.token;

  // At minimum, ensure structure and basic invariants via typia.
  typia.assert<IAuthorizationToken>(token1);
  typia.assert<IAuthorizationToken>(token2);

  // Access token should generally be refreshed on each login. If
  // implementation chooses to reuse it, this assertion will highlight it.
  TestValidator.notEquals(
    "access token should change on successive logins",
    token1.access,
    token2.access,
  );

  // Refresh tokens may or may not rotate; we don't strictly require
  // them to differ, but we can at least assert that expiration windows
  // do not regress.
  TestValidator.predicate(
    "access token expiration of second login should not be earlier than first",
    new Date(token2.expired_at).getTime() >=
      new Date(token1.expired_at).getTime(),
  );
  TestValidator.predicate(
    "refresh token expiration of second login should not be earlier than first",
    new Date(token2.refreshable_until).getTime() >=
      new Date(token1.refreshable_until).getTime(),
  );

  // 6. Third login with different connection metadata (ip, href, referrer).
  const loginHref3: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const loginReferrer3: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const loginBody3 = {
    email,
    password,
    ip: "198.51.100.77",
    href: loginHref3,
    referrer: loginReferrer3,
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const login3: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: loginBody3,
    });
  typia.assert<IDiscussionBoardAdminuser.IAuthorized>(login3);

  // Identity/profile must still be stable.
  const titleStableProfile3 =
    "admin profile should remain stable even when connection metadata changes";
  TestValidator.equals(titleStableProfile3, login1.id, login3.id);
  TestValidator.equals(titleStableProfile3, login1.loginId, login3.loginId);
  TestValidator.equals(
    titleStableProfile3,
    login1.displayName,
    login3.displayName,
  );
  TestValidator.equals(titleStableProfile3, login1.email, login3.email);
  TestValidator.equals(titleStableProfile3, login1.status, login3.status);
  TestValidator.equals(titleStableProfile3, login1.role, login3.role);
  TestValidator.equals(
    "emailVerified flag should stay consistent after connection metadata changes",
    login1.emailVerified,
    login3.emailVerified,
  );
  TestValidator.equals(
    "createdAt should stay consistent after connection metadata changes",
    login1.createdAt,
    login3.createdAt,
  );

  // 7. Basic token sanity check for third login.
  const token3: IAuthorizationToken = login3.token;
  typia.assert<IAuthorizationToken>(token3);

  TestValidator.predicate(
    "third login access token expiration should not be earlier than first login",
    new Date(token3.expired_at).getTime() >=
      new Date(token1.expired_at).getTime(),
  );
  TestValidator.predicate(
    "third login refresh token expiration should not be earlier than first login",
    new Date(token3.refreshable_until).getTime() >=
      new Date(token1.refreshable_until).getTime(),
  );
}
