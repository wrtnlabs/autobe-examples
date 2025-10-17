import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test administrator reviewing community ban details during appeal process.
 *
 * This test validates the complete workflow of ban appeal review by
 * administrators. The scenario simulates a real-world situation where a
 * community member is banned by a moderator, and an administrator needs to
 * review the ban details to evaluate an appeal. This ensures administrators
 * have comprehensive access to all ban metadata required for fair and
 * transparent moderation oversight.
 *
 * Workflow steps:
 *
 * 1. Register administrator account for appeal review authority
 * 2. Register moderator account who will issue the ban
 * 3. Register member account who will be banned and appeal
 * 4. Member creates a community (becomes primary moderator)
 * 5. Switch to moderator context and issue community ban
 * 6. Switch to administrator context and retrieve complete ban details
 * 7. Validate all ban information is accessible including reason, duration, and
 *    metadata
 */
export async function test_api_community_ban_admin_appeal_review(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for appeal review
  const adminData = {
    username: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10) + "A1!",
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminData });
  typia.assert(admin);

  // Step 2: Create moderator account who will issue the ban
  const moderatorData = {
    username: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10) + "A1!",
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 3: Create member account who will be banned
  const memberData = {
    username: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10) + "A1!",
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(member);

  // Step 4: Member creates a community
  const communityData = {
    code: RandomGenerator.alphaNumeric(8).toLowerCase(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    privacy_type: "public",
    posting_permission: "anyone_subscribed",
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
    primary_category: "technology",
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 5: Switch to moderator context and issue ban
  const banReasonCategories = [
    "spam",
    "harassment",
    "rule_violation",
    "offensive_content",
  ] as const;
  const banCategory = RandomGenerator.pick(banReasonCategories);

  const banData = {
    banned_member_id: member.id,
    ban_reason_category: banCategory,
    ban_reason_text: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }),
    internal_notes: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 10,
    }),
    is_permanent: false,
    expiration_date: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
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

  // Step 6: Administrator retrieves complete ban details for appeal review
  const reviewedBan: IRedditLikeCommunityBan =
    await api.functional.redditLike.admin.communities.bans.at(connection, {
      communityId: community.id,
      banId: issuedBan.id,
    });
  typia.assert(reviewedBan);

  // Step 7: Validate ban information matches what was issued
  TestValidator.equals("ban ID matches", reviewedBan.id, issuedBan.id);
  TestValidator.equals(
    "banned member ID matches",
    reviewedBan.banned_member_id,
    member.id,
  );
  TestValidator.equals(
    "community ID matches",
    reviewedBan.community_id,
    community.id,
  );
  TestValidator.equals(
    "ban reason category matches",
    reviewedBan.ban_reason_category,
    banCategory,
  );
  TestValidator.equals(
    "ban reason text matches",
    reviewedBan.ban_reason_text,
    banData.ban_reason_text,
  );
  TestValidator.equals(
    "permanent ban flag matches",
    reviewedBan.is_permanent,
    false,
  );
  TestValidator.predicate(
    "ban is currently active",
    reviewedBan.is_active === true,
  );
  TestValidator.predicate(
    "expiration date exists for temporary ban",
    reviewedBan.expiration_date !== undefined &&
      reviewedBan.expiration_date !== null,
  );
}
