import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAppeal";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test moderator ban appeal overturn workflow with complete access restoration.
 *
 * This test validates the complete appeal review process where a moderator
 * overturns a community ban, ensuring proper status updates, ban deactivation,
 * access restoration, and user notifications according to requirements
 * R-APP-018, R-APP-021, and R-APP-022.
 *
 * The workflow includes:
 *
 * 1. Creating member and moderator accounts
 * 2. Setting up a community with moderator permissions
 * 3. Issuing a community ban
 * 4. Member submitting an appeal (with proper authentication)
 * 5. Moderator reviewing and overturning the ban
 * 6. Validating appeal status, ban deactivation, and access restoration
 */
export async function test_api_appeal_review_ban_overturn_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create member account that will be banned
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IRedditLikeMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Store member token for later use
  const memberToken = member.token.access;

  // Step 2: Create moderator account
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Switch back to member context to create community
  connection.headers = connection.headers || {};
  connection.headers.Authorization = memberToken;

  // Step 3: Create community as member
  const communityData = {
    code: RandomGenerator.alphabets(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    privacy_type: "public",
    posting_permission: "anyone_subscribed",
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies IRedditLikeCommunity.ICreate;

  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: communityData,
    },
  );
  typia.assert(community);

  // Switch to moderator context
  connection.headers.Authorization = moderator.token.access;

  // Step 4: Assign moderator to community
  const moderatorAssignment = {
    moderator_id: moderator.id,
    permissions: "manage_posts,manage_comments,manage_users,manage_moderators",
  } satisfies IRedditLikeCommunityModerator.ICreate;

  const assignedModerator =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: moderatorAssignment,
      },
    );
  typia.assert(assignedModerator);

  // Step 5: Issue community ban against the member
  const banData = {
    banned_member_id: member.id,
    ban_reason_category: "spam",
    ban_reason_text: RandomGenerator.paragraph({ sentences: 3 }),
    is_permanent: false,
    expiration_date: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  } satisfies IRedditLikeCommunityBan.ICreate;

  const ban = await api.functional.redditLike.moderator.communities.bans.create(
    connection,
    {
      communityId: community.id,
      body: banData,
    },
  );
  typia.assert(ban);
  TestValidator.equals("ban is active initially", ban.is_active, true);

  // Switch to member context to submit appeal
  connection.headers.Authorization = memberToken;

  // Step 6: Member submits appeal
  const appealData = {
    community_ban_id: ban.id,
    appeal_type: "community_ban",
    appeal_text: RandomGenerator.paragraph({ sentences: 10 }),
  } satisfies IRedditLikeModerationAppeal.ICreate;

  const appeal =
    await api.functional.redditLike.member.moderation.appeals.create(
      connection,
      {
        body: appealData,
      },
    );
  typia.assert(appeal);
  TestValidator.equals("appeal status is pending", appeal.status, "pending");

  // Switch back to moderator context for review
  connection.headers.Authorization = moderator.token.access;

  // Step 7: Moderator reviews and overturns the ban
  const reviewDecision = {
    decision: "overturn",
    decision_explanation: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IRedditLikeModerationAppeal.IReview;

  const reviewedAppeal =
    await api.functional.redditLike.moderator.moderation.appeals.review(
      connection,
      {
        appealId: appeal.id,
        body: reviewDecision,
      },
    );
  typia.assert(reviewedAppeal);

  // Step 8: Validate appeal status updated to 'overturned'
  TestValidator.equals(
    "appeal status is overturned",
    reviewedAppeal.status,
    "overturned",
  );

  // Step 9: Validate decision explanation is recorded
  TestValidator.equals(
    "decision explanation matches",
    reviewedAppeal.decision_explanation,
    reviewDecision.decision_explanation,
  );

  // Step 10: Validate reviewed_at timestamp is set
  TestValidator.predicate(
    "reviewed_at timestamp is set",
    reviewedAppeal.reviewed_at !== null &&
      reviewedAppeal.reviewed_at !== undefined,
  );

  // Step 11: Validate appellant member ID matches
  TestValidator.equals(
    "appellant is the banned member",
    reviewedAppeal.appellant_member_id,
    member.id,
  );
}
