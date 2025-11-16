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
 * Test that a moderator can successfully update the reason text of an existing
 * community ban.
 *
 * This test validates the ban modification workflow where moderators refine or
 * clarify ban reasons for transparency. The test creates a ban with an initial
 * reason, updates it with a more detailed explanation, and verifies that the
 * updated ban record reflects the new reason text while preserving other fields
 * like status and expiration. The updated_at timestamp should be automatically
 * refreshed to track the modification.
 *
 * Test Flow:
 *
 * 1. Register and authenticate as moderator
 * 2. Create a community for ban management
 * 3. Create initial ban with basic reason
 * 4. Update ban with more detailed reason
 * 5. Verify updated reason and preserved fields
 */
export async function test_api_community_ban_reason_update(
  connection: api.IConnection,
) {
  // Step 1: Register moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePassword123!",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create community
  const communityName = RandomGenerator.alphabets(10);
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Generate member ID to ban
  const bannedMemberId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Create initial ban with basic reason
  const initialReason = "Violation of community guidelines";
  const initialBan: IRedditCommunityCommunityBan =
    await api.functional.redditCommunity.moderator.communities.bans.create(
      connection,
      {
        communityName: communityName,
        body: {
          banned_member_id: bannedMemberId,
          reason: initialReason,
        } satisfies IRedditCommunityCommunityBan.ICreate,
      },
    );
  typia.assert(initialBan);

  // Verify initial ban was created correctly
  TestValidator.equals(
    "initial ban reason matches",
    initialBan.reason,
    initialReason,
  );
  TestValidator.equals("ban status is active", initialBan.status, "active");

  // Step 5: Update ban with more detailed reason
  const updatedReason =
    "Violation of community guidelines - repeated spam posting of commercial links without disclosure, warning issued on previous occasion";
  const updatedBan: IRedditCommunityBan =
    await api.functional.redditCommunity.moderator.bans.update(connection, {
      banId: initialBan.id,
      body: {
        reason: updatedReason,
      } satisfies IRedditCommunityBan.IUpdate,
    });
  typia.assert(updatedBan);

  // Step 6: Verify the updated ban
  TestValidator.equals(
    "updated ban ID matches original",
    updatedBan.id,
    initialBan.id,
  );
  TestValidator.equals(
    "ban reason was updated",
    updatedBan.reason,
    updatedReason,
  );
  TestValidator.notEquals(
    "reason changed from initial",
    updatedBan.reason,
    initialReason,
  );

  // Verify other fields remained unchanged
  TestValidator.equals(
    "ban status preserved",
    updatedBan.status,
    initialBan.status,
  );
  TestValidator.equals(
    "banned member ID preserved",
    updatedBan.reddit_community_member_id,
    initialBan.reddit_community_member_id,
  );
  TestValidator.equals(
    "community ID preserved",
    updatedBan.reddit_community_community_id,
    initialBan.reddit_community_community_id,
  );
  TestValidator.equals(
    "moderator ID preserved",
    updatedBan.reddit_community_moderator_id,
    initialBan.reddit_community_moderator_id,
  );
  TestValidator.equals(
    "created_at timestamp preserved",
    updatedBan.created_at,
    initialBan.created_at,
  );

  // Verify updated_at timestamp was refreshed
  TestValidator.predicate(
    "updated_at timestamp was refreshed",
    new Date(updatedBan.updated_at).getTime() >=
      new Date(initialBan.updated_at).getTime(),
  );
}
