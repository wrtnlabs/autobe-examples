import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_moderator_sessions_logout_all_success(
  connection: api.IConnection,
) {
  // 1. Create a new moderator account via join endpoint
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(5);
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  const joinData = {
    email: moderatorEmail,
    username: moderatorUsername,
    password: moderatorPassword,
    href: "http://localhost:3000/auth/moderator/register",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformModerator.ICreate;

  const authorizedModerator = await api.functional.auth.moderator.join(
    connection,
    {
      body: joinData,
    },
  );
  typia.assert(authorizedModerator);

  // Verify moderator is properly authenticated
  TestValidator.predicate(
    "moderator should have valid ID",
    authorizedModerator.id !== null && authorizedModerator.id !== undefined,
  );
  TestValidator.predicate(
    "moderator should have username",
    authorizedModerator.username === moderatorUsername,
  );
  TestValidator.predicate(
    "moderator should have email",
    authorizedModerator.email === moderatorEmail,
  );

  // Verify authorization tokens are issued
  TestValidator.predicate(
    "access token should be provided",
    authorizedModerator.token.access !== null &&
      authorizedModerator.token.access !== undefined,
  );
  TestValidator.predicate(
    "refresh token should be provided",
    authorizedModerator.token.refresh !== null &&
      authorizedModerator.token.refresh !== undefined,
  );

  // 2. Invoke logout-all endpoint to terminate all sessions
  const logoutResult =
    await api.functional.communityPlatform.moderator.auth.moderator.sessions.logout_all.logoutAll(
      connection,
    );
  typia.assert(logoutResult);

  // 3. Verify sessions have been invalidated
  TestValidator.predicate(
    "logout-all should complete successfully",
    logoutResult === undefined || logoutResult === null,
  );
}
