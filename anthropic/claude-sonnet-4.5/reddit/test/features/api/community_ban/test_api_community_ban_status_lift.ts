import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityBan";
import type { IRedditCommunityCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityMember";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test that a moderator can lift an active ban by updating its status to
 * 'lifted'.
 *
 * This test validates the early ban termination workflow where moderators
 * manually remove bans before expiration, such as due to successful appeals or
 * moderator discretion. The test creates an active ban, updates its status to
 * 'lifted', and verifies that the member's participation privileges are
 * restored while the ban record is preserved for audit history.
 *
 * Test Workflow:
 *
 * 1. Create and authenticate as a moderator
 * 2. Create a community for ban management context
 * 3. Create an active ban on a community member
 * 4. Update the ban status to 'lifted'
 * 5. Verify the ban record is preserved with updated status and timestamps
 */
export async function test_api_community_ban_status_lift(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as moderator
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    nickname: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create a community for ban management
  const communityData = {
    name: RandomGenerator.alphabets(10),
    display_title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    rules: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 3: Create an active ban on a community member
  const bannedMemberId = typia.random<string & tags.Format<"uuid">>();

  const banData = {
    banned_member_id: bannedMemberId,
    reason: "Test ban for validation purposes - will be lifted",
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies IRedditCommunityCommunityBan.ICreate;

  const createdBan: IRedditCommunityCommunityBan =
    await api.functional.redditCommunity.moderator.communities.bans.create(
      connection,
      {
        communityName: community.name,
        body: banData,
      },
    );
  typia.assert(createdBan);

  // Verify initial ban status is active
  TestValidator.equals(
    "initial ban status is active",
    createdBan.status,
    "active",
  );

  // Step 4: Update the ban status to 'lifted'
  const updateData = {
    status: "lifted" as const,
  } satisfies IRedditCommunityBan.IUpdate;

  const updatedBan: IRedditCommunityBan =
    await api.functional.redditCommunity.moderator.bans.update(connection, {
      banId: createdBan.id,
      body: updateData,
    });
  typia.assert(updatedBan);

  // Step 5: Verify the ban was successfully lifted
  TestValidator.equals(
    "ban status updated to lifted",
    updatedBan.status,
    "lifted",
  );
  TestValidator.equals("ban ID remains the same", updatedBan.id, createdBan.id);
  TestValidator.equals(
    "banned member ID unchanged",
    updatedBan.reddit_community_member_id,
    bannedMemberId,
  );
  TestValidator.equals(
    "community ID unchanged",
    updatedBan.reddit_community_community_id,
    community.id,
  );

  // Verify updated_at timestamp was modified
  TestValidator.predicate(
    "updated_at timestamp reflects modification",
    new Date(updatedBan.updated_at).getTime() >=
      new Date(createdBan.updated_at).getTime(),
  );
}
