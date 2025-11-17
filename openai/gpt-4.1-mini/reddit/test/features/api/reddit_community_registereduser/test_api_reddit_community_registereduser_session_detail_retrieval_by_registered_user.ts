import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import type { IRedditCommunityRegistereduserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegistereduserSession";

export async function test_api_reddit_community_registereduser_session_detail_retrieval_by_registered_user(
  connection: api.IConnection,
) {
  // 1. Register a new user to get authorization
  const user: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        // Use realistic random email and password
        email: `${RandomGenerator.name(1)}@example.com`,
        password: "strongPassword123",
      } satisfies IRedditCommunityRegisteredUser.ICreate,
    });
  typia.assert(user);

  // 2. Create a session record for the registered user
  const input: IRedditCommunityRegistereduserSession.ICreate = {
    ip: "192.168.1.1",
    href: "https://redditcommunity.example.com/home",
    referrer: "https://google.com",
    created_at: new Date().toISOString(),
    expired_at: null,
  };
  const createdSession: IRedditCommunityRegistereduserSession =
    await api.functional.redditCommunity.registeredUser.redditCommunityRegisteredusers.sessions.create(
      connection,
      {
        redditCommunityRegistereduserId: user.id,
        body: input,
      },
    );
  typia.assert(createdSession);

  // 3. Retrieve the session details by the session ID
  const retrievedSession: IRedditCommunityRegistereduserSession =
    await api.functional.redditCommunity.registeredUser.redditCommunityRegisteredusers.sessions.at(
      connection,
      {
        redditCommunityRegistereduserId: user.id,
        id: createdSession.id,
      },
    );
  typia.assert(retrievedSession);

  // 4. Validate the session data matches creation input
  TestValidator.equals(
    "session IP should match",
    retrievedSession.ip,
    input.ip,
  );
  TestValidator.equals(
    "session href should match",
    retrievedSession.href,
    input.href,
  );
  TestValidator.equals(
    "session referrer should match",
    retrievedSession.referrer,
    input.referrer,
  );
  TestValidator.equals(
    "session created_at timestamp should match",
    retrievedSession.created_at,
    input.created_at,
  );
  TestValidator.equals(
    "session expired_at should be null",
    retrievedSession.expired_at,
    null,
  );

  // 5. Validate the user ID matches registered user
  TestValidator.equals(
    "registered user ID should match in session",
    retrievedSession.reddit_community_registereduser_id,
    user.id,
  );
}
