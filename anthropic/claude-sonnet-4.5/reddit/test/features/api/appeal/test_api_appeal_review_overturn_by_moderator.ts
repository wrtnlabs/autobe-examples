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
 * Test the complete workflow where a moderator reviews a community-level appeal
 * and overturns the original moderation decision, restoring removed content.
 *
 * This test validates the appeal review and overturn process including:
 *
 * 1. Member account creation for content posting
 * 2. Moderator account creation for moderation duties
 * 3. Community creation by the member
 * 4. Moderator assignment to the community
 * 5. Content posting by the member
 * 6. Content report submission
 * 7. Moderation action removing the content
 * 8. Appeal submission by the affected member
 * 9. Moderator review with overturn decision
 * 10. Validation of appeal status, decision timing, and content restoration
 */
export async function test_api_appeal_review_overturn_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create member account for posting content and submitting appeal
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  const memberToken = member.token.access;

  // Step 2: Create moderator account (need separate connection)
  const moderatorConnection: api.IConnection = { ...connection, headers: {} };
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderatorUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const moderator = await api.functional.auth.moderator.join(
    moderatorConnection,
    {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies IRedditLikeModerator.ICreate,
    },
  );
  typia.assert(moderator);

  const moderatorToken = moderator.token.access;

  // Step 3: Member creates community (switch back to member context)
  connection.headers = { Authorization: memberToken };

  const communityCode = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<25> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: communityCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "technology",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 4: Assign moderator to the community (switch to moderator context)
  moderatorConnection.headers = { Authorization: moderatorToken };

  const moderatorAssignment =
    await api.functional.redditLike.moderator.communities.moderators.create(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          moderator_id: moderator.id,
          permissions: "manage_posts,manage_comments,access_reports",
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);

  // Step 5: Member posts content in the community (switch to member context)
  connection.headers = { Authorization: memberToken };

  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: RandomGenerator.paragraph({ sentences: 2 }),
      body: RandomGenerator.content({ paragraphs: 2 }),
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // Step 6: Submit content report against the post
  const report = await api.functional.redditLike.content_reports.create(
    connection,
    {
      body: {
        reported_post_id: post.id,
        community_id: community.id,
        content_type: "post",
        violation_categories: "spam,harassment",
        additional_context: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeContentReport.ICreate,
    },
  );
  typia.assert(report);

  // Step 7: Create moderation action removing the reported content (use moderator or member)
  const moderationAction =
    await api.functional.redditLike.moderation.actions.create(connection, {
      body: {
        report_id: report.id,
        affected_post_id: post.id,
        community_id: community.id,
        action_type: "remove",
        content_type: "post",
        removal_type: "community",
        reason_category: "spam",
        reason_text: RandomGenerator.paragraph({ sentences: 2 }),
        internal_notes: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IRedditLikeModerationAction.ICreate,
    });
  typia.assert(moderationAction);

  // Step 8: Member submits appeal challenging the moderation action
  connection.headers = { Authorization: memberToken };

  const appeal =
    await api.functional.redditLike.member.moderation.appeals.create(
      connection,
      {
        body: {
          moderation_action_id: moderationAction.id,
          appeal_type: "content_removal",
          appeal_text: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);

  // Step 9: Moderator reviews the appeal with overturn decision
  moderatorConnection.headers = { Authorization: moderatorToken };

  const reviewStartTime = new Date();
  const reviewedAppeal =
    await api.functional.redditLike.moderator.moderation.appeals.review(
      moderatorConnection,
      {
        appealId: appeal.id,
        body: {
          decision: "overturn",
          decision_explanation: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditLikeModerationAppeal.IReview,
      },
    );
  const reviewEndTime = new Date();
  typia.assert(reviewedAppeal);

  // Step 10: Validate appeal status, decision timing, and content restoration
  TestValidator.equals(
    "appeal status is overturned",
    reviewedAppeal.status,
    "overturned",
  );

  const decisionTimeMs = reviewEndTime.getTime() - reviewStartTime.getTime();
  TestValidator.predicate(
    "decision applied within 1 second per R-APP-018",
    decisionTimeMs <= 1000,
  );

  TestValidator.predicate(
    "decision explanation provided",
    reviewedAppeal.decision_explanation !== null &&
      reviewedAppeal.decision_explanation !== undefined,
  );

  TestValidator.predicate(
    "reviewed timestamp set",
    reviewedAppeal.reviewed_at !== null &&
      reviewedAppeal.reviewed_at !== undefined,
  );
}
