import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAction";
import type { IRedditLikeModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAppeal";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test the complete workflow of a member submitting an appeal after their post
 * is removed by a moderator.
 *
 * This test validates the end-to-end appeal submission process including:
 *
 * 1. Member account creation
 * 2. Moderator account creation
 * 3. Community creation by member
 * 4. Post creation by member
 * 5. Content report submission
 * 6. Moderation action (post removal) by moderator
 * 7. Appeal submission by member
 * 8. Validation of appeal properties and routing
 */
export async function test_api_appeal_submission_for_content_removal(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: memberEmail,
        password: memberPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create community as member (already authenticated)
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(15),
        name: RandomGenerator.name(3),
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
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Member creates a post
  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 8,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);

  // Step 4: Submit content report on the post
  const contentReport: IRedditLikeContentReport =
    await api.functional.redditLike.content_reports.create(connection, {
      body: {
        reported_post_id: post.id,
        community_id: community.id,
        content_type: "post",
        violation_categories: "spam,harassment",
        additional_context: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IRedditLikeContentReport.ICreate,
    });
  typia.assert(contentReport);

  // Step 5: Create moderator account and switch context
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: moderatorEmail,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IRedditLikeModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 6: Moderator creates moderation action (remove post)
  const moderationAction: IRedditLikeModerationAction =
    await api.functional.redditLike.moderation.actions.create(connection, {
      body: {
        report_id: contentReport.id,
        affected_post_id: post.id,
        community_id: community.id,
        action_type: "remove",
        content_type: "post",
        removal_type: "community",
        reason_category: "spam",
        reason_text: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 6,
          wordMax: 12,
        }),
        internal_notes: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IRedditLikeModerationAction.ICreate,
    });
  typia.assert(moderationAction);

  // Step 7: Switch back to member context by re-registering (SDK manages token automatically)
  const memberAgain: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: memberPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(memberAgain);

  // Step 8: Member submits appeal
  const appealText = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 8,
  });

  const appeal: IRedditLikeModerationAppeal =
    await api.functional.redditLike.member.moderation.appeals.create(
      connection,
      {
        body: {
          moderation_action_id: moderationAction.id,
          appeal_type: "content_removal",
          appeal_text: appealText,
        } satisfies IRedditLikeModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);

  // Step 9: Validate appeal properties
  TestValidator.equals(
    "appeal type matches",
    appeal.appeal_type,
    "content_removal",
  );
  TestValidator.equals("appeal status is pending", appeal.status, "pending");
  TestValidator.predicate(
    "appeal text length is valid",
    appeal.appeal_text.length >= 50 && appeal.appeal_text.length <= 1000,
  );
  TestValidator.predicate(
    "appeal is not escalated initially",
    appeal.is_escalated === false,
  );

  // Validate expected resolution timeframe (2-3 days for community-level appeals)
  const createdAt = new Date(appeal.created_at);
  const expectedResolutionAt = new Date(appeal.expected_resolution_at);
  const daysDifference =
    (expectedResolutionAt.getTime() - createdAt.getTime()) /
    (1000 * 60 * 60 * 24);
  TestValidator.predicate(
    "expected resolution is 2-3 days",
    daysDifference >= 2 && daysDifference <= 3,
  );
}
