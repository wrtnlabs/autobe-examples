import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

export async function test_api_content_report_comment_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create member account for community and content creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: memberEmail,
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create community where the reportable comment will be posted
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
        primary_category: "discussion",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Create post to host the comment that will be reported
  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: typia.random<string & tags.MinLength<3> & tags.MaxLength<300>>(),
      body: typia.random<string & tags.MaxLength<40000>>(),
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // Step 4: Create comment that will be reported for content violations
  const comment = await api.functional.redditLike.member.comments.create(
    connection,
    {
      body: {
        reddit_like_post_id: post.id,
        content_text: typia.random<
          string & tags.MinLength<1> & tags.MaxLength<10000>
        >(),
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(comment);

  // Step 5: Submit content report for the comment
  const reportBody = {
    reported_comment_id: comment.id,
    community_id: community.id,
    content_type: "comment",
    violation_categories: "harassment,spam",
    additional_context: typia.random<string & tags.MaxLength<500>>(),
  } satisfies IRedditLikeContentReport.ICreate;

  const contentReport = await api.functional.redditLike.content_reports.create(
    connection,
    {
      body: reportBody,
    },
  );
  typia.assert(contentReport);

  // Step 6: Create moderator account for comment report retrieval and review
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: moderatorEmail,
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 7: Assign moderator to the community to grant comment report access permissions
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

  // Step 8: Moderator retrieves the detailed comment report
  const retrievedReport =
    await api.functional.redditLike.moderator.content_reports.at(connection, {
      reportId: contentReport.id,
    });
  typia.assert(retrievedReport);

  // Validate report details
  TestValidator.equals(
    "report ID matches",
    retrievedReport.id,
    contentReport.id,
  );
  TestValidator.equals(
    "content type is comment",
    retrievedReport.content_type,
    "comment",
  );
  TestValidator.equals(
    "violation categories match",
    retrievedReport.violation_categories,
    "harassment,spam",
  );
  TestValidator.equals(
    "report status is pending",
    retrievedReport.status,
    "pending",
  );
}
