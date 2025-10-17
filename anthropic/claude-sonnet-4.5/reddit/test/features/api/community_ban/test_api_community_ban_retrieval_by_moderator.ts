import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test complete workflow for moderator retrieving community ban details.
 *
 * This test validates the entire business flow of community moderation:
 *
 * 1. Moderator registration and authentication
 * 2. Member account creation (user who will be banned)
 * 3. Community creation by moderator
 * 4. Ban issuance against the member
 * 5. Ban details retrieval and validation
 *
 * The test ensures moderators can access complete ban information including
 * banned member identity, ban reason, duration, expiration, active status, and
 * metadata necessary for ban management and appeal workflows.
 */
export async function test_api_community_ban_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as moderator
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create member account to be banned
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 3: Create community as moderator (switch back to moderator context)
  const communityData = {
    code: RandomGenerator.alphabets(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
    privacy_type: "public",
    posting_permission: "anyone_subscribed",
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
    primary_category: "general",
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 4: Issue ban against the member
  const banReasonCategories = [
    "spam",
    "harassment",
    "hate_speech",
    "rule_violation",
  ] as const;
  const banCategory = RandomGenerator.pick(banReasonCategories);

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);

  const banData = {
    banned_member_id: member.id,
    ban_reason_category: banCategory,
    ban_reason_text: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    internal_notes: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 8,
    }),
    is_permanent: false,
    expiration_date: futureDate.toISOString(),
  } satisfies IRedditLikeCommunityBan.ICreate;

  const issuedBan: IRedditLikeCommunityBan =
    await api.functional.redditLike.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: banData,
      },
    );
  typia.assert(issuedBan);

  // Step 5: Retrieve ban details
  const retrievedBan: IRedditLikeCommunityBan =
    await api.functional.redditLike.moderator.communities.bans.at(connection, {
      communityId: community.id,
      banId: issuedBan.id,
    });
  typia.assert(retrievedBan);

  // Step 6: Validate retrieved ban details
  TestValidator.equals("ban ID matches", retrievedBan.id, issuedBan.id);
  TestValidator.equals(
    "banned member ID matches",
    retrievedBan.banned_member_id,
    member.id,
  );
  TestValidator.equals(
    "community ID matches",
    retrievedBan.community_id,
    community.id,
  );
  TestValidator.equals(
    "ban reason category matches",
    retrievedBan.ban_reason_category,
    banCategory,
  );
  TestValidator.equals(
    "ban reason text matches",
    retrievedBan.ban_reason_text,
    banData.ban_reason_text,
  );
  TestValidator.equals(
    "permanent status matches",
    retrievedBan.is_permanent,
    false,
  );
  TestValidator.equals(
    "expiration date matches",
    retrievedBan.expiration_date,
    banData.expiration_date,
  );
  TestValidator.equals("ban is active", retrievedBan.is_active, true);
  TestValidator.predicate(
    "created_at is valid",
    retrievedBan.created_at !== undefined && retrievedBan.created_at.length > 0,
  );
}
