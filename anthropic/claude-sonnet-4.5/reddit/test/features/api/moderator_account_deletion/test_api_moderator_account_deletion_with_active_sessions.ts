import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test deletion of a moderator account with multiple active authentication
 * sessions.
 *
 * This test validates the critical security requirement that when a moderator
 * account is deleted, all associated authentication sessions are properly
 * cleaned up from the database. The test creates a moderator account,
 * establishes multiple sessions through repeated login operations, then deletes
 * the account to verify proper cascade deletion of all session data.
 *
 * Test flow:
 *
 * 1. Create a new moderator account (establishes first session)
 * 2. Perform multiple login operations to create additional sessions
 * 3. Delete the moderator account by username
 * 4. Verify the account deletion returns complete moderator data
 *
 * The backend should automatically clean up all entries in the
 * reddit_community_moderator_sessions table through cascade deletion.
 */
export async function test_api_moderator_account_deletion_with_active_sessions(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const email = typia.random<string & tags.Format<"email">>();
  const password = "TestPassword123!";
  const nickname = RandomGenerator.name();

  const createBody = {
    email: email,
    password: password,
    nickname: nickname,
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const createdModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: createBody,
    });

  typia.assert(createdModerator);

  // Step 2: Perform multiple login operations to create additional sessions
  const loginBody = {
    email: email,
    password: password,
    ip: "192.168.1.100",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ILogin;

  // Login 2-3 times to create multiple sessions
  const sessionCount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<3>
  >();

  await ArrayUtil.asyncRepeat(sessionCount, async (index) => {
    const loginResult: IRedditCommunityCommunityModerator.IAuthorized =
      await api.functional.auth.moderator.login(connection, {
        body: {
          ...loginBody,
          ip: `192.168.1.${100 + index}`,
        },
      });

    typia.assert(loginResult);
    TestValidator.equals("login email matches", loginResult.email, email);
  });

  // Step 3: Delete the moderator account
  const deletedModerator: IRedditCommunityCommunityModerator =
    await api.functional.redditCommunity.moderator.moderators.erase(
      connection,
      {
        username: createdModerator.username,
      },
    );

  typia.assert(deletedModerator);

  // Step 4: Verify the deleted moderator data
  TestValidator.equals(
    "deleted moderator ID matches",
    deletedModerator.id,
    createdModerator.id,
  );
  TestValidator.equals(
    "deleted moderator username matches",
    deletedModerator.username,
    createdModerator.username,
  );
  TestValidator.equals(
    "deleted moderator email matches",
    deletedModerator.email,
    email,
  );
}
