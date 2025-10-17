import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAction";
import type { IRedditLikeModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAppeal";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test that a moderator can retrieve detailed information about a moderation
 * appeal submitted in their community.
 *
 * This test validates the moderator appeal retrieval workflow. Due to API
 * limitations (no separate login endpoints available), this test creates all
 * entities sequentially and validates that the appeal retrieval API returns
 * complete appeal information.
 *
 * Workflow:
 *
 * 1. Create member account for posting content
 * 2. Member creates a community
 * 3. Member creates a post in the community
 * 4. Post gets reported for rule violations
 * 5. Create moderator account
 * 6. Assign moderator to community with manage_posts permission
 * 7. Moderator creates moderation action to remove the post
 * 8. Submit appeal against the moderation action
 * 9. Moderator retrieves the appeal details
 * 10. Validate appeal contains complete information
 */
export async function test_api_appeal_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: `member_${RandomGenerator.alphaNumeric(8)}@test.com`,
    password: RandomGenerator.alphaNumeric(10) + "A1!",
  } satisfies IRedditLikeMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Member creates a community
  const communityData = {
    code: RandomGenerator.alphaNumeric(10),
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
  } satisfies IRedditLikeCommunity.ICreate;

  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: communityData,
    },
  );
  typia.assert(community);

  // Step 3: Member creates a post
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
  } satisfies IRedditLikePost.ICreate;

  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: postData,
  });
  typia.assert(post);

  // Step 4: Report the post for rule violations
  const reportData = {
    reported_post_id: post.id,
    community_id: community.id,
    content_type: "post",
    violation_categories: "spam",
    additional_context: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 4,
      wordMax: 10,
    }),
  } satisfies IRedditLikeContentReport.ICreate;

  const report = await api.functional.redditLike.content_reports.create(
    connection,
    {
      body: reportData,
    },
  );
  typia.assert(report);

  // Step 5: Create moderator account
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(12),
    email: `moderator_${RandomGenerator.alphaNumeric(8)}@test.com`,
    password: RandomGenerator.alphaNumeric(10) + "A1!",
  } satisfies IRedditLikeModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 6: Assign moderator to community with manage_posts permission
  const moderatorAssignmentData = {
    moderator_id: moderator.id,
    permissions: "manage_posts,access_reports",
  } satisfies IRedditLikeCommunityModerator.ICreate;

  const moderatorAssignment =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: moderatorAssignmentData,
      },
    );
  typia.assert(moderatorAssignment);

  // Step 7: Moderator creates moderation action to remove the post
  const moderationActionData = {
    report_id: report.id,
    affected_post_id: post.id,
    community_id: community.id,
    action_type: "remove",
    content_type: "post",
    removal_type: "community",
    reason_category: "spam",
    reason_text: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 5,
      wordMax: 12,
    }),
  } satisfies IRedditLikeModerationAction.ICreate;

  const moderationAction =
    await api.functional.redditLike.moderation.actions.create(connection, {
      body: moderationActionData,
    });
  typia.assert(moderationAction);

  // Step 8: Submit appeal against the moderation action
  const appealText = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 15,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });

  const appealData = {
    moderation_action_id: moderationAction.id,
    appeal_type: "content_removal",
    appeal_text: appealText,
  } satisfies IRedditLikeModerationAppeal.ICreate;

  const appeal =
    await api.functional.redditLike.member.moderation.appeals.create(
      connection,
      {
        body: appealData,
      },
    );
  typia.assert(appeal);

  // Step 9: Moderator retrieves the appeal details
  const retrievedAppeal =
    await api.functional.redditLike.moderator.moderation.appeals.at(
      connection,
      {
        appealId: appeal.id,
      },
    );
  typia.assert(retrievedAppeal);

  // Step 10: Validate appeal contains complete information
  TestValidator.equals("appeal ID matches", retrievedAppeal.id, appeal.id);
  TestValidator.equals(
    "appellant member ID matches",
    retrievedAppeal.appellant_member_id,
    appeal.appellant_member_id,
  );
  TestValidator.equals(
    "appeal type is content_removal",
    retrievedAppeal.appeal_type,
    "content_removal",
  );
  TestValidator.equals(
    "appeal text matches submitted text",
    retrievedAppeal.appeal_text,
    appealText,
  );
  TestValidator.predicate(
    "appeal has pending status",
    retrievedAppeal.status === "pending" ||
      retrievedAppeal.status === "under_review",
  );
  TestValidator.predicate(
    "appeal has created_at timestamp",
    typeof retrievedAppeal.created_at === "string" &&
      retrievedAppeal.created_at.length > 0,
  );
  TestValidator.predicate(
    "appeal has expected_resolution_at timestamp",
    typeof retrievedAppeal.expected_resolution_at === "string" &&
      retrievedAppeal.expected_resolution_at.length > 0,
  );
  TestValidator.equals(
    "appeal is not escalated initially",
    retrievedAppeal.is_escalated,
    false,
  );
}
