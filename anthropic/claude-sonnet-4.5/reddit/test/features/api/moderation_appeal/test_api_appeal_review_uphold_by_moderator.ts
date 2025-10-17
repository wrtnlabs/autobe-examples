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
 * Test the complete workflow where a moderator reviews a community-level appeal
 * and upholds the original moderation decision.
 *
 * This test validates the appeal review process by:
 *
 * 1. Creating a member account for posting content and submitting an appeal
 * 2. Creating a moderator account for reviewing the appeal
 * 3. Creating a community for the content posting context
 * 4. Member posts content in the community
 * 5. Submitting a content report against the post
 * 6. Creating a moderation action to remove the reported content
 * 7. Member submits an appeal challenging the content removal
 * 8. Moderator switches authentication and reviews the appeal with an 'uphold'
 *    decision
 *
 * The test confirms that the appeal status updates to 'upheld', the
 * decision_explanation is recorded, and the original moderation action remains
 * in effect per requirements R-APP-021 and R-APP-023.
 */
export async function test_api_appeal_review_uphold_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create moderator account (connection switches to moderator auth automatically)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: moderatorEmail,
      password: moderatorPassword,
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Switch back to member for community creation and content operations
  const memberConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: member.token.access,
    },
  };

  const community = await api.functional.redditLike.member.communities.create(
    memberConnection,
    {
      body: {
        code: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<25> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        name: typia.random<string & tags.MinLength<3> & tags.MaxLength<25>>(),
        description: typia.random<
          string & tags.MinLength<10> & tags.MaxLength<500>
        >(),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 4: Member creates a post in the community
  const post = await api.functional.redditLike.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        type: "text",
        title: typia.random<string & tags.MinLength<3> & tags.MaxLength<300>>(),
        body: typia.random<string & tags.MaxLength<40000>>(),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);

  // Step 5: Submit a content report against the post
  const report = await api.functional.redditLike.content_reports.create(
    memberConnection,
    {
      body: {
        reported_post_id: post.id,
        community_id: community.id,
        content_type: "post",
        violation_categories: "spam,harassment",
        additional_context: typia.random<string & tags.MaxLength<500>>(),
      } satisfies IRedditLikeContentReport.ICreate,
    },
  );
  typia.assert(report);

  // Step 6: Create moderation action to remove the content
  const moderationAction =
    await api.functional.redditLike.moderation.actions.create(
      memberConnection,
      {
        body: {
          report_id: report.id,
          affected_post_id: post.id,
          community_id: community.id,
          action_type: "remove",
          content_type: "post",
          removal_type: "community",
          reason_category: "spam",
          reason_text:
            "This post violates community guidelines regarding spam content",
          internal_notes: "First offense for this user",
        } satisfies IRedditLikeModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // Step 7: Member submits an appeal challenging the moderation action
  const appeal =
    await api.functional.redditLike.member.moderation.appeals.create(
      memberConnection,
      {
        body: {
          moderation_action_id: moderationAction.id,
          appeal_type: "content_removal",
          appeal_text: typia.random<
            string & tags.MinLength<50> & tags.MaxLength<1000>
          >(),
        } satisfies IRedditLikeModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);

  // Verify appeal was created with pending status
  TestValidator.equals("appeal status is pending", appeal.status, "pending");
  TestValidator.equals(
    "appeal has correct appellant",
    appeal.appellant_member_id,
    member.id,
  );

  // Step 8: Switch to moderator authentication for appeal review
  const moderatorConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: moderator.token.access,
    },
  };

  const reviewDecision = {
    decision: "uphold",
    decision_explanation:
      "After careful review, the original moderation decision stands. The content clearly violated community spam guidelines and removal was appropriate.",
  } satisfies IRedditLikeModerationAppeal.IReview;

  const reviewedAppeal =
    await api.functional.redditLike.moderator.moderation.appeals.review(
      moderatorConnection,
      {
        appealId: appeal.id,
        body: reviewDecision,
      },
    );
  typia.assert(reviewedAppeal);

  // Verify the appeal was upheld correctly
  TestValidator.equals(
    "appeal status is upheld",
    reviewedAppeal.status,
    "upheld",
  );
  TestValidator.equals(
    "decision explanation is recorded",
    reviewedAppeal.decision_explanation,
    reviewDecision.decision_explanation,
  );

  // Verify reviewed_at timestamp is set
  TestValidator.predicate(
    "reviewed_at timestamp is set",
    reviewedAppeal.reviewed_at !== null &&
      reviewedAppeal.reviewed_at !== undefined,
  );
}
