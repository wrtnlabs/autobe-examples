import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import type { IRedditCommunityRegistereduserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegistereduserSession";

export async function test_api_reddit_community_registereduser_session_creation_by_registered_user(
  connection: api.IConnection,
) {
  // 1. Register a new user with unique email and password
  const email = `${RandomGenerator.alphaNumeric(12)}@example.com`;
  const password = RandomGenerator.alphaNumeric(16);
  const userCreateBody = {
    email,
    password,
  } satisfies IRedditCommunityRegisteredUser.ICreate;
  const authorizedUser: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);

  // 2. Generate numeric IP address with correct format
  const ipOctet1 = RandomGenerator.sample(
    [...Array(256).keys()].map(String),
    1,
  )[0];
  const ipOctet2 = RandomGenerator.sample(
    [...Array(256).keys()].map(String),
    1,
  )[0];
  const ip = `192.168.${ipOctet1}.${ipOctet2}`;

  // 3. Create a new login session for the authorized user
  const sessionCreateBody = {
    ip,
    href: `https://redditcommunity.example.com/users/${authorizedUser.id}/dashboard`,
    referrer: `https://redditcommunity.example.com/login`,
    created_at: new Date().toISOString(),
  } satisfies IRedditCommunityRegistereduserSession.ICreate;

  const session: IRedditCommunityRegistereduserSession =
    await api.functional.redditCommunity.registeredUser.redditCommunityRegisteredusers.sessions.create(
      connection,
      {
        redditCommunityRegistereduserId: authorizedUser.id,
        body: sessionCreateBody,
      },
    );
  typia.assert(session);

  // 4. Validate returned session properties
  TestValidator.equals(
    "session user ID matches authorized user",
    session.reddit_community_registereduser_id,
    authorizedUser.id,
  );
  // Case-insensitive UUID regex for validation
  TestValidator.predicate(
    "session ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      session.id,
    ),
  );
  TestValidator.equals(
    "session IP matches input",
    session.ip,
    sessionCreateBody.ip,
  );
  TestValidator.equals(
    "session href matches input",
    session.href,
    sessionCreateBody.href,
  );
  TestValidator.equals(
    "session referrer matches input",
    session.referrer,
    sessionCreateBody.referrer,
  );
  TestValidator.equals(
    "session created_at matches input",
    session.created_at,
    sessionCreateBody.created_at,
  );
  TestValidator.predicate(
    "session expired_at is null or undefined",
    session.expired_at === null || session.expired_at === undefined,
  );
}
