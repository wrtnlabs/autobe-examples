import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAction";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test the complete workflow for administrators to retrieve detailed activity
 * metrics for a specific moderator.
 *
 * This test validates the moderator accountability and performance monitoring
 * system by creating a complete moderation workflow and verifying that all
 * activities are properly tracked and reported.
 *
 * Steps:
 *
 * 1. Create and authenticate as administrator
 * 2. Create moderator account for activity tracking
 * 3. Create member account to generate content
 * 4. Create community for moderation activities
 * 5. Assign moderator to the community
 * 6. Create posts for moderation
 * 7. Submit content reports
 * 8. Create moderation actions to generate metrics
 * 9. Retrieve moderator activity as admin
 * 10. Validate activity metrics accuracy
 */
export async function test_api_moderator_activity_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as administrator
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
    } satisfies IRedditLikeAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create moderator account for activity tracking
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Create member account to generate content
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create community for moderation activities
  const community = await api.functional.redditLike.member.communities.create(
    connection,
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

  // Switch to moderator authentication for assignment
  connection.headers = { Authorization: moderator.token.access };

  // Step 5: Assign moderator to the community
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

  // Switch to member authentication for creating posts
  connection.headers = { Authorization: member.token.access };

  // Step 6: Create posts for moderation
  const post1 = await api.functional.redditLike.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        type: "text",
        title: typia.random<string & tags.MinLength<3> & tags.MaxLength<300>>(),
        body: typia.random<string & tags.MaxLength<40000>>(),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post1);

  const post2 = await api.functional.redditLike.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        type: "text",
        title: typia.random<string & tags.MinLength<3> & tags.MaxLength<300>>(),
        body: typia.random<string & tags.MaxLength<40000>>(),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post2);

  // Step 7: Submit content reports
  const report1 = await api.functional.redditLike.content_reports.create(
    connection,
    {
      body: {
        reported_post_id: post1.id,
        community_id: community.id,
        content_type: "post",
        violation_categories: "spam,harassment",
        additional_context: "This post contains spam content",
      } satisfies IRedditLikeContentReport.ICreate,
    },
  );
  typia.assert(report1);

  const report2 = await api.functional.redditLike.content_reports.create(
    connection,
    {
      body: {
        reported_post_id: post2.id,
        community_id: community.id,
        content_type: "post",
        violation_categories: "hate_speech",
        additional_context: "Violates community guidelines",
      } satisfies IRedditLikeContentReport.ICreate,
    },
  );
  typia.assert(report2);

  // Switch to moderator authentication for moderation actions
  connection.headers = { Authorization: moderator.token.access };

  // Step 8: Create moderation actions to generate metrics
  const action1 =
    await api.functional.redditLike.moderator.moderation.actions.create(
      connection,
      {
        body: {
          report_id: report1.id,
          affected_post_id: post1.id,
          community_id: community.id,
          action_type: "remove",
          content_type: "post",
          removal_type: "community",
          reason_category: "spam",
          reason_text: "Post removed for spam violation",
        } satisfies IRedditLikeModerationAction.ICreate,
      },
    );
  typia.assert(action1);

  const action2 =
    await api.functional.redditLike.moderator.moderation.actions.create(
      connection,
      {
        body: {
          report_id: report2.id,
          affected_post_id: post2.id,
          community_id: community.id,
          action_type: "remove",
          content_type: "post",
          removal_type: "platform",
          reason_category: "hate_speech",
          reason_text: "Post removed for hate speech",
        } satisfies IRedditLikeModerationAction.ICreate,
      },
    );
  typia.assert(action2);

  // Switch to admin authentication for retrieving activity
  connection.headers = { Authorization: admin.token.access };

  // Step 9: Retrieve moderator activity as admin
  const activity = await api.functional.redditLike.admin.moderators.activity(
    connection,
    {
      moderatorId: moderator.id,
    },
  );
  typia.assert(activity);

  // Step 10: Validate activity metrics accuracy
  TestValidator.predicate(
    "total actions should be at least 2",
    activity.total_actions >= 2,
  );

  TestValidator.predicate(
    "total reports reviewed should be at least 2",
    activity.total_reports_reviewed >= 2,
  );

  TestValidator.predicate(
    "total content removals should be at least 2",
    activity.total_content_removals >= 2,
  );

  TestValidator.predicate(
    "activity metrics should be non-negative",
    activity.total_actions >= 0 &&
      activity.total_reports_reviewed >= 0 &&
      activity.total_content_removals >= 0 &&
      activity.total_bans_issued >= 0,
  );
}
