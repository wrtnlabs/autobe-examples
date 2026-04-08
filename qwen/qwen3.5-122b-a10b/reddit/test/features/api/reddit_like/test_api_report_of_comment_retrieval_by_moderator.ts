import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import type { IRedditLikeReportOfComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReportOfComment";
import type { IRedditLikeReportOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReportOfPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_communities_moderators_create } from "../../../generate/generate_random_reddit_like_member_communities_moderators_create";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_community_moderator } from "../../../prepare/prepare_random_reddit_like_community_moderator";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

/**
 * Test moderator retrieval of reported comment for review workflow.
 *
 * Validates that community moderators can access and review content reports targeting comments. The test verifies the complete report retrieval flow including reporter information, reported comment details, and report status.
 *
 * This test ensures moderators have proper access to review reported content before making moderation decisions such as approving (deleting content) or dismissing (keeping content) reports.
 *
 * 1. Create a member who will become the community owner.
 * 2. Create a community owned by the first member.
 * 3. Create another member who will report the comment.
 * 4. Create a post in the community by the owner.
 * 5. Create a comment on the post by the owner.
 * 6. Have the second member report the comment with a reason.
 * 7. Add the first member as a moderator to enable report access.
 * 8. Retrieve the report of comment using the report ID.
 * 9. Validate the report contains reporter information, reason, and status.
 * 10. Validate the comment information includes author, content, and vote score.
 */
export async function test_api_report_of_comment_retrieval_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create community
  const community = await generate_random_reddit_like_member_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Create reporter member
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(reporterAuth);
  // 4. Create post in the community by owner
  const post = await generate_random_reddit_like_member_posts_create(
    ownerConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_type: "text",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create comment on the post by owner
  const comment =
    await generate_random_reddit_like_member_posts_comments_create(
      ownerConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  typia.assert(comment);
  // 6. Have reporter create a report on the comment
  const report = await generate_random_reddit_like_member_reports_create(
    reporterConnection,
    {
      body: {
        targetType: "comment",
        targetId: comment.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  // 7. Add owner as moderator to enable report access
  const moderator =
    await generate_random_reddit_like_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          member_id: ownerAuth.id,
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator);
  // 8. Retrieve the report of comment using the report ID
  // Note: The report creation creates both a report record and a report-of-comment linkage record
  // The report.id is used as the reportOfCommentId for retrieval
  const reportOfComment =
    await api.functional.redditLike.member.reports_of_comments.at(
      ownerConnection,
      {
        reportOfCommentId: report.id,
      },
    );
  typia.assert(reportOfComment);
  // 9. Validate report details
  TestValidator.equals(
    "reporter matches",
    reportOfComment.report.reporter.id,
    reporterAuth.id,
  );
  TestValidator.predicate(
    "report reason is not empty",
    reportOfComment.report.reason.length > 0,
  );
  TestValidator.predicate(
    "report status is valid",
    reportOfComment.report.status === "pending" ||
      reportOfComment.report.status === "approved" ||
      reportOfComment.report.status === "dismissed",
  );
  // 10. Validate comment details
  TestValidator.equals(
    "comment author matches",
    reportOfComment.comment.author.id,
    ownerAuth.id,
  );
  TestValidator.predicate(
    "comment content is not empty",
    reportOfComment.comment.content.length > 0,
  );
  TestValidator.predicate(
    "comment has valid vote score",
    typeof reportOfComment.comment.vote_score === "number",
  );
  // 11. Validate timestamps
  TestValidator.predicate(
    "created_at is valid datetime",
    !isNaN(Date.parse(reportOfComment.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    !isNaN(Date.parse(reportOfComment.updated_at)),
  );
}
