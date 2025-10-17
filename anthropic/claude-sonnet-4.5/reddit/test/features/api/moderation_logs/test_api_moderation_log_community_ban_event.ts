import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationLog";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test community ban issuance with complete workflow validation.
 *
 * This test validates the complete community ban workflow from moderator
 * assignment through ban issuance. While the original scenario requested
 * moderation log retrieval, the available APIs do not provide a mechanism to
 * obtain the log ID from the ban creation response. Therefore, this test
 * focuses on validating the ban creation process and verifying that all ban
 * details are properly recorded.
 *
 * Workflow:
 *
 * 1. Create moderator account with ban issuance authority
 * 2. Create community where moderation will occur
 * 3. Assign moderator to community with user management permissions
 * 4. Create member account that will be subject to ban
 * 5. Issue community ban with detailed reasoning and duration
 * 6. Validate ban record contains all expected details
 *
 * Validation:
 *
 * - Moderator successfully assigned to community
 * - Ban issued with correct target member
 * - Ban reason and category properly recorded
 * - Ban duration and expiration correctly set
 * - Ban is active and enforceable
 */
export async function test_api_moderation_log_community_ban_event(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorUsername = RandomGenerator.alphaNumeric(12);
  const moderatorEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IRedditLikeModerator.ICreate,
    });
  typia.assert(moderator);

  // Validate moderator creation
  TestValidator.equals(
    "moderator username matches",
    moderator.username,
    moderatorUsername,
  );
  TestValidator.equals(
    "moderator email matches",
    moderator.email,
    moderatorEmail,
  );
  TestValidator.predicate("moderator has valid ID", moderator.id.length === 36);

  // Step 2: Create community
  const communityCode = RandomGenerator.alphaNumeric(15);
  const communityName = RandomGenerator.name(2);

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: communityCode,
        name: communityName,
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
        primary_category: "general",
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Validate community creation
  TestValidator.equals("community code matches", community.code, communityCode);
  TestValidator.equals("community name matches", community.name, communityName);
  TestValidator.predicate(
    "community subscriber count starts at zero",
    community.subscriber_count === 0,
  );

  // Step 3: Assign moderator to community with ban permissions
  const moderatorAssignment: IRedditLikeCommunityModerator =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          moderator_id: moderator.id,
          permissions: "manage_users,manage_posts,access_reports",
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);

  // Validate moderator assignment
  TestValidator.equals(
    "moderator assigned to correct community",
    moderatorAssignment.community_id,
    community.id,
  );
  TestValidator.equals(
    "correct moderator assigned",
    moderatorAssignment.moderator_id,
    moderator.id,
  );
  TestValidator.predicate(
    "moderator is not primary",
    moderatorAssignment.is_primary === false,
  );

  // Step 4: Create member account to be banned
  const memberUsername = RandomGenerator.alphaNumeric(10);
  const memberEmail = `${RandomGenerator.alphaNumeric(8)}@test.com`;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: RandomGenerator.alphaNumeric(10),
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Validate member creation
  TestValidator.equals(
    "member username matches",
    member.username,
    memberUsername,
  );
  TestValidator.predicate(
    "member starts with zero karma",
    member.post_karma === 0 && member.comment_karma === 0,
  );

  // Step 5: Issue community ban
  const banReasonCategories = ["spam", "harassment", "rule_violation"] as const;
  const selectedBanReason = RandomGenerator.pick(banReasonCategories);
  const banReasonText = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const banDurationDays =
    (typia.random<number & tags.Type<"uint32">>() % 30) + 1;

  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + banDurationDays);
  const expirationDateString = expirationDate.toISOString();

  const communityBan: IRedditLikeCommunityBan =
    await api.functional.redditLike.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          banned_member_id: member.id,
          ban_reason_category: selectedBanReason,
          ban_reason_text: banReasonText,
          internal_notes: RandomGenerator.paragraph({ sentences: 1 }),
          is_permanent: false,
          expiration_date: expirationDateString,
        } satisfies IRedditLikeCommunityBan.ICreate,
      },
    );
  typia.assert(communityBan);

  // Step 6: Validate ban record contains all expected details
  TestValidator.equals(
    "ban targets correct member",
    communityBan.banned_member_id,
    member.id,
  );

  TestValidator.equals(
    "ban targets correct community",
    communityBan.community_id,
    community.id,
  );

  TestValidator.equals(
    "ban reason category matches",
    communityBan.ban_reason_category,
    selectedBanReason,
  );

  TestValidator.equals(
    "ban reason text matches",
    communityBan.ban_reason_text,
    banReasonText,
  );

  TestValidator.predicate(
    "ban is temporary",
    communityBan.is_permanent === false,
  );

  TestValidator.predicate(
    "ban is currently active",
    communityBan.is_active === true,
  );

  TestValidator.predicate("ban has valid ID", communityBan.id.length === 36);

  TestValidator.predicate(
    "ban created timestamp is valid",
    new Date(communityBan.created_at).getTime() > 0,
  );

  // Validate expiration date if present
  if (communityBan.expiration_date) {
    TestValidator.predicate(
      "ban expiration date is in the future",
      new Date(communityBan.expiration_date).getTime() > new Date().getTime(),
    );
  }
}
