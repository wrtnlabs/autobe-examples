import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";

export async function test_api_moderator_login_existing(
  connection: api.IConnection,
) {
  // 1. Create a fresh moderator user to establish a new account context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: `https://example.com/moderator/join`,
    referrer: `https://example.com/referrer`,
  } satisfies IRedditCommunityModerator.IJoin;

  const joinedModerator: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, { body: joinBody });
  typia.assert(joinedModerator);

  // 2. Login with correct credentials from previous join
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
    ip: null,
    href: `https://example.com/moderator/login`,
    referrer: `https://example.com/referrer`,
  } satisfies IRedditCommunityModerator.ILogin;

  const loggedInModerator: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, { body: loginBody });
  typia.assert(loggedInModerator);

  // Validate returned token structure
  const token: IAuthorizationToken = loggedInModerator.token;
  typia.assert(token);

  TestValidator.predicate(
    "access token is a non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token is a non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );

  TestValidator.predicate(
    "expired_at follows ISO date-time format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.\d+)?Z$/.test(
      token.expired_at,
    ),
  );

  TestValidator.predicate(
    "refreshable_until follows ISO date-time format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.\d+)?Z$/.test(
      token.refreshable_until,
    ),
  );

  // 3. Attempt login with wrong password and expect failure
  await TestValidator.error(
    "login with incorrect password should throw error",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          email: joinBody.email,
          password: joinBody.password + "wrong",
          ip: null,
          href: `https://example.com/moderator/login`,
          referrer: `https://example.com/referrer`,
        } satisfies IRedditCommunityModerator.ILogin,
      });
    },
  );
}
