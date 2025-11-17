import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModeratorSession";

export async function test_api_moderator_delete_own_session(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "password123";
  const moderator: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies IRedditCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a new session for this moderator
  const sessionInput: IRedditCommunityModeratorSession.ICreate = {
    ip: "192.168.1.100",
    href: "https://example.com/moderator/home",
    referrer: "https://example.com/login",
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 day later
  };

  const session: IRedditCommunityModeratorSession =
    await api.functional.redditCommunity.moderator.redditCommunityModerators.sessions.create(
      connection,
      {
        redditCommunityModeratorId: moderator.id,
        body: sessionInput,
      },
    );
  typia.assert(session);

  // Step 3: Delete the session
  await api.functional.redditCommunity.moderator.redditCommunityModerators.sessions.erase(
    connection,
    {
      redditCommunityModeratorId: moderator.id,
      id: session.id,
    },
  );
}
