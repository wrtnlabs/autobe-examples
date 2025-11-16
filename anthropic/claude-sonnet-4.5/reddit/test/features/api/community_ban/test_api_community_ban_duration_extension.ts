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
 * Test that a moderator can extend a temporary ban by updating the expires_at
 * timestamp to a later date.
 *
 * This validates the ban duration modification workflow where moderators need
 * to extend enforcement periods based on repeated violations or changed
 * circumstances. The test should create a temporary ban with a near-future
 * expiration, update the expires_at to a significantly later timestamp, and
 * verify that the ban remains active with the new expiration date.
 *
 * Steps:
 *
 * 1. Register and authenticate as a moderator
 * 2. Create a community for ban management
 * 3. Create a temporary ban with near-future expiration (using random member ID)
 * 4. Update the ban to extend the expiration to a later date
 * 5. Verify the ban has the new expiration timestamp and remains active
 */
export async function test_api_community_ban_duration_extension(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as moderator
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "moderator123!",
    nickname: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create a community
  const communityData = {
    name: RandomGenerator.alphaNumeric(10).toLowerCase(),
    display_title: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 7,
    }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
    rules: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 8 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    banner_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 3: Create initial temporary ban with near-future expiration
  const now = new Date();
  const nearFutureExpiration = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

  const bannedMemberId = typia.random<string & tags.Format<"uuid">>();

  const initialBanData = {
    banned_member_id: bannedMemberId,
    reason: "Initial violation - temporary ban for review",
    expires_at: nearFutureExpiration.toISOString(),
  } satisfies IRedditCommunityCommunityBan.ICreate;

  const createdBan: IRedditCommunityCommunityBan =
    await api.functional.redditCommunity.moderator.communities.bans.create(
      connection,
      {
        communityName: community.name,
        body: initialBanData,
      },
    );
  typia.assert(createdBan);

  // Verify initial ban was created with correct expiration
  TestValidator.equals(
    "initial ban has near-future expiration",
    createdBan.expires_at,
    nearFutureExpiration.toISOString(),
  );
  TestValidator.equals(
    "initial ban status is active",
    createdBan.status,
    "active",
  );

  // Step 4: Extend ban duration by updating expires_at to a later date
  const extendedExpiration = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

  const updateData = {
    expires_at: extendedExpiration.toISOString(),
  } satisfies IRedditCommunityBan.IUpdate;

  const updatedBan: IRedditCommunityBan =
    await api.functional.redditCommunity.moderator.bans.update(connection, {
      banId: createdBan.id,
      body: updateData,
    });
  typia.assert(updatedBan);

  // Step 5: Verify the ban was extended successfully
  TestValidator.equals(
    "ban ID remains unchanged",
    updatedBan.id,
    createdBan.id,
  );
  TestValidator.equals(
    "ban expiration updated to extended date",
    updatedBan.expires_at,
    extendedExpiration.toISOString(),
  );
  TestValidator.equals(
    "ban status remains active after extension",
    updatedBan.status,
    "active",
  );
  TestValidator.equals(
    "ban reason unchanged",
    updatedBan.reason,
    createdBan.reason,
  );
  TestValidator.equals(
    "banned member ID unchanged",
    updatedBan.reddit_community_member_id,
    bannedMemberId,
  );
}
