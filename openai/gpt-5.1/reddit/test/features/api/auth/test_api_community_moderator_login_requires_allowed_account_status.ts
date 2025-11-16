import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";

export async function test_api_community_moderator_login_requires_allowed_account_status(
  connection: api.IConnection,
) {
  // 1. Register a new community moderator via join (allowed status path)
  const password = RandomGenerator.alphaNumeric(16);
  const username = RandomGenerator.alphabets(12);
  const email = typia.random<string & tags.Format<"email">>();

  const joinBody = {
    username,
    email,
    password,
    display_name: RandomGenerator.name(2),
    ip: null,
    href: "https://community.example.com/auth/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const joined = await api.functional.auth.communityModerator.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(joined);

  const joinToken: IAuthorizationToken = joined.token;
  typia.assert<IAuthorizationToken>(joinToken);

  // 2. Perform a successful login using the same identifier/password (allowed path)
  const loginBodyOk = {
    identifier: username,
    password,
    ip: null,
    href: "https://community.example.com/auth/login",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const loggedIn = await api.functional.auth.communityModerator.login(
    connection,
    {
      body: loginBodyOk,
    },
  );
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(loggedIn);

  const loginToken: IAuthorizationToken = loggedIn.token;
  typia.assert<IAuthorizationToken>(loginToken);

  // Ensure that login issues a valid-looking access token (non-empty string)
  TestValidator.predicate(
    "login token access should be a non-empty string",
    () => loginToken.access.length > 0,
  );

  // 3. Attempt login with credentials that must be rejected (proxy for disallowed status)
  //    Here we re-use the same identifier but intentionally change the password.
  const badPassword = `${password}_wrong`;
  const loginBodyBadPassword = {
    identifier: username,
    password: badPassword,
    ip: null,
    href: "https://community.example.com/auth/login",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  await TestValidator.error(
    "community moderator login with wrong password must fail and not issue authorized context",
    async () => {
      await api.functional.auth.communityModerator.login(connection, {
        body: loginBodyBadPassword,
      });
    },
  );
}
