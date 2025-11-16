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
 * Test retrieval of a permanent community ban where expires_at is null.
 *
 * This validates that permanent bans are correctly represented with null
 * expiration timestamps and active status. The test creates a permanent ban
 * (without expires_at), retrieves it by ID, and verifies that the expires_at
 * field is null while the status is active, confirming that the ban remains in
 * effect indefinitely.
 */
export async function test_api_community_ban_retrieval_with_permanent_status(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator to obtain permissions for ban management
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a community where the ban will be issued
  const communityNameBase = RandomGenerator.alphabets(10);
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityNameBase,
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Generate a member ID for the ban (using a valid UUID format)
  const bannedMemberId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Create a permanent ban without expiration timestamp
  const banReason =
    "Severe violation of community guidelines - permanent removal";
  const permanentBan: IRedditCommunityCommunityBan =
    await api.functional.redditCommunity.moderator.communities.bans.create(
      connection,
      {
        communityName: community.name,
        body: {
          banned_member_id: bannedMemberId,
          reason: banReason,
        } satisfies IRedditCommunityCommunityBan.ICreate,
      },
    );
  typia.assert(permanentBan);

  // Step 5: Retrieve the ban by ID to verify permanent status
  const retrievedBan: IRedditCommunityBan =
    await api.functional.redditCommunity.moderator.bans.at(connection, {
      banId: permanentBan.id,
    });
  typia.assert(retrievedBan);

  // Step 6: Validate that the ban is permanent (expires_at is null)
  TestValidator.equals(
    "permanent ban expires_at should be null",
    retrievedBan.expires_at,
    null,
  );

  // Step 7: Validate that the ban status is active
  TestValidator.equals(
    "permanent ban status should be active",
    retrievedBan.status,
    "active",
  );

  // Step 8: Validate ban reason matches
  TestValidator.equals(
    "ban reason should match",
    retrievedBan.reason,
    banReason,
  );

  // Step 9: Validate community association
  TestValidator.equals(
    "ban community ID should match",
    retrievedBan.reddit_community_community_id,
    community.id,
  );

  // Step 10: Validate moderator association
  TestValidator.equals(
    "ban moderator ID should match",
    retrievedBan.reddit_community_moderator_id,
    moderator.id,
  );
}
