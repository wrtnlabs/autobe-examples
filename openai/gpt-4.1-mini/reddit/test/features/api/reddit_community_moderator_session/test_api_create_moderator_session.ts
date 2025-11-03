import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModeratorSession";

export async function test_api_create_moderator_session(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new moderator user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: `https://example.com/${RandomGenerator.alphaNumeric(8)}`,
    referrer: `https://referrer.com/${RandomGenerator.alphaNumeric(8)}`,
  } satisfies IRedditCommunityModerator.IJoin;

  const moderator: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: joinBody,
    });
  typia.assert(moderator);

  // 2. Create a session for the moderator
  const now = new Date();
  const createdAt = now.toISOString();
  const expiredAt = new Date(now.getTime() + 1000 * 60 * 60).toISOString();

  const createSessionBody = {
    reddit_community_moderator_id: moderator.id,
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: `https://example.com/${RandomGenerator.alphaNumeric(12)}`,
    referrer: `https://referrer.com/${RandomGenerator.alphaNumeric(12)}`,
    created_at: createdAt,
    expired_at: expiredAt,
  } satisfies IRedditCommunityModeratorSession.ICreate;

  const session: IRedditCommunityModeratorSession =
    await api.functional.redditCommunity.moderator.moderators.sessions.create(
      connection,
      {
        moderatorId: moderator.id,
        body: createSessionBody,
      },
    );
  typia.assert(session);

  TestValidator.equals(
    "session moderator ID should match",
    session.reddit_community_moderator_id,
    moderator.id,
  );

  TestValidator.equals(
    "session IP should match",
    session.ip,
    createSessionBody.ip,
  );

  TestValidator.equals(
    "session href should match",
    session.href,
    createSessionBody.href,
  );

  TestValidator.equals(
    "session referrer should match",
    session.referrer,
    createSessionBody.referrer,
  );

  TestValidator.equals(
    "session created_at should match",
    session.created_at,
    createSessionBody.created_at,
  );

  if (session.expired_at !== undefined && session.expired_at !== null) {
    TestValidator.equals(
      "session expired_at should match",
      session.expired_at,
      createSessionBody.expired_at ?? null,
    );
  }

  // 3. Unauthorized user cannot create moderator session (simulate unauthenticated)
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthorized user cannot create moderator session",
    async () => {
      await api.functional.redditCommunity.moderator.moderators.sessions.create(
        unauthenticatedConn,
        {
          moderatorId: moderator.id,
          body: createSessionBody,
        },
      );
    },
  );
}
