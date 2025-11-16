import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

export async function test_api_member_user_login_wrong_password(
  connection: api.IConnection,
) {
  // 1. Register a member user with a known password.
  const username: string = RandomGenerator.alphabets(12);
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password = "P@ssw0rd-123";

  const joinBody = {
    username,
    email,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const joined: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(joined);

  // 2. Create an unauthenticated connection for login attempts.
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Attempt login with wrong password and expect failure.
  const wrongPassword = "P@ssw0rd-999";

  await TestValidator.error(
    "memberUser login fails with wrong password",
    async () => {
      await api.functional.auth.memberUser.login(unauthConn, {
        body: {
          identifier: email,
          password: wrongPassword,
        } satisfies ICommunityPlatformMemberuser.ILoginRequest,
      });
    },
  );

  // 4. Attempt login with correct password to confirm success path still works.
  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(unauthConn, {
      body: {
        identifier: email,
        password,
      } satisfies ICommunityPlatformMemberuser.ILoginRequest,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);

  // 5. Business-level sanity checks: same user id, email, username.
  TestValidator.equals(
    "authorized member id matches joined member id",
    authorized.id,
    joined.id,
  );
  TestValidator.equals(
    "authorized email matches joined email",
    authorized.email,
    joined.email,
  );
  TestValidator.equals(
    "authorized username matches joined username",
    authorized.username,
    joined.username,
  );
}
