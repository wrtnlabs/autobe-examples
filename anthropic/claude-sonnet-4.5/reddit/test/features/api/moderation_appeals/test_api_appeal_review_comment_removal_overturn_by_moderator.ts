import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAction";
import type { IRedditLikeModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAppeal";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

export async function test_api_appeal_review_comment_removal_overturn_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create member account for commenting and appeal submission
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = RandomGenerator.alphaNumeric(12);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create moderator account for appeal review
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderatorUsername = RandomGenerator.alphaNumeric(12);

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: moderatorUsername,
      email: moderatorEmail,
      password: moderatorPassword,
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderator);

  // Switch back to member context to create community
  const memberReauth = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(memberReauth);

  // Step 3: Create community for content context
  const communityCode = RandomGenerator.alphaNumeric(10).toLowerCase();
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: communityCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Switch to moderator context for moderator assignment
  const moderatorReauth = await api.functional.auth.moderator.join(connection, {
    body: {
      username: moderatorUsername,
      email: moderatorEmail,
      password: moderatorPassword,
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderatorReauth);

  // Step 4: Assign moderator to community
  const moderatorAssignment =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          moderator_id: moderator.id,
          permissions: "manage_posts,manage_comments,access_reports",
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);

  // Switch back to member context for posting
  await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });

  // Step 5: Create post to hold comments
  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: RandomGenerator.paragraph({ sentences: 3 }),
      body: RandomGenerator.content({ paragraphs: 2 }),
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // Step 6: Create comment that will be reported and moderated
  const comment = await api.functional.redditLike.member.comments.create(
    connection,
    {
      body: {
        reddit_like_post_id: post.id,
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(comment);

  // Step 7: Submit content report for the comment
  const report = await api.functional.redditLike.content_reports.create(
    connection,
    {
      body: {
        reported_comment_id: comment.id,
        community_id: community.id,
        content_type: "comment",
        violation_categories: "harassment,spam",
        additional_context: "This comment violates community guidelines",
      } satisfies IRedditLikeContentReport.ICreate,
    },
  );
  typia.assert(report);

  // Step 8: Create moderation action removing the comment
  const moderationAction =
    await api.functional.redditLike.moderation.actions.create(connection, {
      body: {
        report_id: report.id,
        affected_comment_id: comment.id,
        community_id: community.id,
        action_type: "remove",
        content_type: "comment",
        removal_type: "community_removal",
        reason_category: "rule_violation",
        reason_text: "Comment violates harassment policy",
        internal_notes: "Removing due to reported harassment",
      } satisfies IRedditLikeModerationAction.ICreate,
    });
  typia.assert(moderationAction);

  // Step 9: Submit appeal from comment author (still as member)
  const appeal =
    await api.functional.redditLike.member.moderation.appeals.create(
      connection,
      {
        body: {
          moderation_action_id: moderationAction.id,
          appeal_type: "content_removal",
          appeal_text: RandomGenerator.paragraph({ sentences: 8 }),
        } satisfies IRedditLikeModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);

  // Step 10: Create admin account to review the appeal
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const adminUsername = RandomGenerator.alphaNumeric(12);

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      email: adminEmail,
      password: adminPassword,
    } satisfies IRedditLikeAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 11: Review appeal with overturn decision as admin
  const reviewedAppeal =
    await api.functional.redditLike.admin.moderation.appeals.review(
      connection,
      {
        appealId: appeal.id,
        body: {
          decision: "overturn",
          decision_explanation: RandomGenerator.paragraph({ sentences: 6 }),
        } satisfies IRedditLikeModerationAppeal.IReview,
      },
    );
  typia.assert(reviewedAppeal);

  // Validate appeal was updated with overturn decision
  TestValidator.equals(
    "appeal status should be overturned",
    reviewedAppeal.status,
    "overturned",
  );
  TestValidator.predicate(
    "decision explanation should be present",
    reviewedAppeal.decision_explanation !== null &&
      reviewedAppeal.decision_explanation !== undefined &&
      reviewedAppeal.decision_explanation.length > 0,
  );
  TestValidator.predicate(
    "reviewed timestamp should be set",
    reviewedAppeal.reviewed_at !== null &&
      reviewedAppeal.reviewed_at !== undefined,
  );
}
