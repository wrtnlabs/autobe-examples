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
 * Test that a moderator can reduce a temporary ban duration by updating
 * expires_at to an earlier future timestamp.
 *
 * This test validates the ban leniency workflow where moderators shorten
 * enforcement periods based on appeal consideration or changed assessment. The
 * test creates a temporary ban with a distant future expiration, updates the
 * expires_at to a nearer future timestamp, and verifies that the ban duration
 * is successfully reduced while maintaining active status.
 *
 * Workflow:
 *
 * 1. Authenticate as moderator with ban management authority
 * 2. Create a community for ban modification
 * 3. Create a temporary ban with long duration (30 days)
 * 4. Update the ban to reduce duration to shorter period (7 days)
 * 5. Verify ban duration successfully reduced while status remains active
 */
export async function test_api_community_ban_duration_reduction(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
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

  // Step 2: Create community for ban management
  const communityData = {
    name: RandomGenerator.alphabets(10),
    display_title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    rules: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 3: Create temporary ban with distant future expiration (30 days from now)
  const now = new Date();
  const originalExpirationDate = new Date(
    now.getTime() + 30 * 24 * 60 * 60 * 1000,
  );
  const originalExpiresAt = originalExpirationDate.toISOString();

  const banData = {
    banned_member_id: typia.random<string & tags.Format<"uuid">>(),
    reason: "Repeated spam posting violating community guidelines",
    expires_at: originalExpiresAt,
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

  // Validate initial ban creation
  TestValidator.equals(
    "initial ban status is active",
    createdBan.status,
    "active",
  );
  TestValidator.equals(
    "initial expires_at matches creation",
    createdBan.expires_at,
    originalExpiresAt,
  );

  // Step 4: Reduce ban duration to 7 days from now
  const reducedExpirationDate = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  );
  const reducedExpiresAt = reducedExpirationDate.toISOString();

  const updateData = {
    expires_at: reducedExpiresAt,
  } satisfies IRedditCommunityBan.IUpdate;

  const updatedBan: IRedditCommunityBan =
    await api.functional.redditCommunity.moderator.bans.update(connection, {
      banId: createdBan.id,
      body: updateData,
    });
  typia.assert(updatedBan);

  // Step 5: Validate ban duration reduction
  TestValidator.equals(
    "ban status remains active after reduction",
    updatedBan.status,
    "active",
  );
  TestValidator.equals(
    "expires_at updated to reduced duration",
    updatedBan.expires_at,
    reducedExpiresAt,
  );

  // Verify the new expiration is earlier than the original
  const originalTime = new Date(originalExpiresAt).getTime();
  const reducedTime = new Date(reducedExpiresAt).getTime();
  TestValidator.predicate(
    "reduced expiration is earlier than original",
    reducedTime < originalTime,
  );

  // Verify the new expiration is still in the future
  TestValidator.predicate(
    "reduced expiration is still in future",
    reducedTime > now.getTime(),
  );
}
