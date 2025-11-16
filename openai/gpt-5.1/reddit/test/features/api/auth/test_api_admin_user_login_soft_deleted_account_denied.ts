import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";

export async function test_api_admin_user_login_soft_deleted_account_denied(
  connection: api.IConnection,
) {
  // 1. Prepare deterministic but random-like admin credentials
  const username: string = RandomGenerator.alphabets(12);
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  // 2. Join as a new adminUser
  const joinBody = {
    username,
    email,
    password,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const joined: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(joined);

  // Basic sanity checks for join
  TestValidator.equals(
    "joined admin username matches requested username",
    joined.username,
    username,
  );
  TestValidator.equals(
    "joined admin email matches requested email",
    joined.email,
    email,
  );

  // 3. Successful login attempt using username as identifier
  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const loginBody = {
    identifier: username,
    password,
    href,
    referrer,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const loggedIn: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: loginBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(loggedIn);

  TestValidator.equals(
    "logged-in admin username should equal joined username",
    loggedIn.username,
    joined.username,
  );
  TestValidator.equals(
    "logged-in admin email should equal joined email",
    loggedIn.email,
    joined.email,
  );

  // 4. Prepare an unauthenticated connection clone by resetting headers
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Negative login attempt with wrong identifier but correct password
  const wrongIdentifier: string = `${username}_deleted_like`; // simulating a non-existing/soft-deleted account identifier
  const negativeLoginBody = {
    identifier: wrongIdentifier,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  await TestValidator.error(
    "login should fail when identifier does not match any active adminUser",
    async () => {
      await api.functional.auth.adminUser.login(anonymousConnection, {
        body: negativeLoginBody,
      });
    },
  );
}
