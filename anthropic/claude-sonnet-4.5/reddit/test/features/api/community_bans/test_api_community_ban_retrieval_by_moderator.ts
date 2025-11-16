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
 * Test that a moderator can successfully retrieve detailed information about a
 * specific community ban.
 *
 * This test validates the complete ban retrieval workflow including:
 *
 * - Moderator authentication
 * - Community creation
 * - Member ban creation
 * - Ban detail retrieval by ID
 *
 * The test ensures that the returned ban record contains all expected fields
 * including banned member information, issuing moderator details, community
 * context, ban reason, status, expiration timestamp, and audit timestamps.
 *
 * Workflow:
 *
 * 1. Authenticate as moderator to obtain authorization
 * 2. Create a community where the ban will be issued
 * 3. Issue a ban to a community member (using generated UUID)
 * 4. Retrieve the ban details using the ban ID
 * 5. Validate all fields in the retrieved ban record
 */
export async function test_api_community_ban_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Create a community where the ban will be issued
  const communityName = RandomGenerator.alphabets(10);
  const communityData = {
    name: communityName,
    display_title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 3 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    banner_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 3: Issue a ban to a community member
  const bannedMemberId = typia.random<string & tags.Format<"uuid">>();
  const banReason = RandomGenerator.paragraph({ sentences: 2 });
  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const banCreateData = {
    banned_member_id: bannedMemberId,
    reason: banReason,
    expires_at: expiresAt,
  } satisfies IRedditCommunityCommunityBan.ICreate;

  const createdBan =
    await api.functional.redditCommunity.moderator.communities.bans.create(
      connection,
      {
        communityName: community.name,
        body: banCreateData,
      },
    );
  typia.assert(createdBan);

  // Step 4: Retrieve the ban details using the ban ID
  const retrievedBan = await api.functional.redditCommunity.moderator.bans.at(
    connection,
    {
      banId: createdBan.id,
    },
  );
  typia.assert(retrievedBan);

  // Step 5: Validate the retrieved ban record
  TestValidator.equals("ban ID matches", retrievedBan.id, createdBan.id);
  TestValidator.equals(
    "banned member ID matches",
    retrievedBan.reddit_community_member_id,
    bannedMemberId,
  );
  TestValidator.equals(
    "community ID matches",
    retrievedBan.reddit_community_community_id,
    community.id,
  );
  TestValidator.equals(
    "moderator ID matches",
    retrievedBan.reddit_community_moderator_id,
    moderator.id,
  );
  TestValidator.equals("ban reason matches", retrievedBan.reason, banReason);
  TestValidator.equals("ban status is active", retrievedBan.status, "active");
  TestValidator.equals(
    "expiration timestamp matches",
    retrievedBan.expires_at,
    expiresAt,
  );

  // Validate nested community summary
  TestValidator.equals(
    "community summary ID matches",
    retrievedBan.community.id,
    community.id,
  );
  TestValidator.equals(
    "community summary name matches",
    retrievedBan.community.name,
    community.name,
  );
  TestValidator.equals(
    "community summary display_title matches",
    retrievedBan.community.display_title,
    community.display_title,
  );

  // Validate nested banned member summary
  TestValidator.equals(
    "banned member summary ID matches",
    retrievedBan.banned_member.id,
    bannedMemberId,
  );

  // Validate nested moderator summary
  TestValidator.equals(
    "moderator summary ID matches",
    retrievedBan.moderator.id,
    moderator.id,
  );
  TestValidator.equals(
    "moderator summary username matches",
    retrievedBan.moderator.username,
    moderator.username,
  );
}
