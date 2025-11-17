import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import type { IRedditCommunityRegistereduserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegistereduserSession";

export async function test_api_reddit_community_registereduser_session_update_by_registered_user(
  connection: api.IConnection,
) {
  // 1. Registered user signs up to create account and get authorization token
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const registeredUser: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        email: userEmail,
        password: "securePassword123",
      } satisfies IRedditCommunityRegisteredUser.ICreate,
    });
  typia.assert(registeredUser);

  // 2. Create a session for the registered user
  const sessionCreationBody = {
    ip: "192.168.1.100",
    href: "https://redditcommunity.example.com/login",
    referrer: "https://redditcommunity.example.com/home",
    created_at: new Date().toISOString(),
    expired_at: null,
  } satisfies IRedditCommunityRegistereduserSession.ICreate;

  const session: IRedditCommunityRegistereduserSession =
    await api.functional.redditCommunity.registeredUser.redditCommunityRegisteredusers.sessions.create(
      connection,
      {
        redditCommunityRegistereduserId: registeredUser.id,
        body: sessionCreationBody,
      },
    );
  typia.assert(session);

  // 3. Update the session details with new data
  const sessionUpdateBody = {
    ip: "10.0.0.200",
    href: "https://redditcommunity.example.com/dashboard",
    referrer: "https://redditcommunity.example.com/login",
    expired_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  } satisfies IRedditCommunityRegistereduserSession.IUpdate;

  const updatedSession: IRedditCommunityRegistereduserSession =
    await api.functional.redditCommunity.registeredUser.redditCommunityRegisteredusers.sessions.update(
      connection,
      {
        redditCommunityRegistereduserId: registeredUser.id,
        id: session.id,
        body: sessionUpdateBody,
      },
    );
  typia.assert(updatedSession);

  // 4. Validate that the update has applied correctly
  TestValidator.equals(
    "updated session ip",
    updatedSession.ip,
    sessionUpdateBody.ip,
  );
  TestValidator.equals(
    "updated session href",
    updatedSession.href,
    sessionUpdateBody.href,
  );
  TestValidator.equals(
    "updated session referrer",
    updatedSession.referrer,
    sessionUpdateBody.referrer,
  );
  // expired_at is nullable, ensure either null or exact string equality
  if (updatedSession.expired_at === null) {
    TestValidator.equals("updated session expired_at is null", null, null);
  } else {
    TestValidator.equals(
      "updated session expired_at",
      updatedSession.expired_at,
      sessionUpdateBody.expired_at!,
    );
  }
}
