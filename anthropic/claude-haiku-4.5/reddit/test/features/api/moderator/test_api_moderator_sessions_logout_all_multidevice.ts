import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_moderator_sessions_logout_all_multidevice(
  connection: api.IConnection,
) {
  // Create initial moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePassword123!";

  const moderatorData = {
    email: moderatorEmail,
    username: RandomGenerator.alphabets(8),
    password: moderatorPassword,
    href: "https://example.com/auth/register",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformModerator.ICreate;

  // Create moderator account - initial session
  const moderatorAuth: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderatorAuth);

  // Store the session token from join response
  const sessionToken = moderatorAuth.token.access;

  // Create a connection with the session token for logout-all call
  const connectionWithSession: api.IConnection = {
    ...connection,
    headers: {
      Authorization: `Bearer ${sessionToken}`,
    },
  };

  // Call logout-all endpoint to terminate all sessions
  await api.functional.communityPlatform.moderator.auth.moderator.sessions.logout_all.logoutAll(
    connectionWithSession,
  );

  // Verify that the session token is invalidated after logout-all
  // by attempting to use it again
  await TestValidator.error(
    "session should be invalidated after logout-all",
    async () => {
      await api.functional.communityPlatform.moderator.auth.moderator.sessions.logout_all.logoutAll(
        connectionWithSession,
      );
    },
  );
}
