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
 * Test moderator retrieval of a comment report for content moderation review.
 *
 * Validates that a community moderator can access complete report details when reviewing reported comments. The test exercises the full moderation workflow from account creation through report retrieval, ensuring moderators have visibility into reporter identity, violation reason, and the reported comment content with its nested structure.
 *
 * The report response includes the actor_type discriminator indicating this is a comment report, along with the specific comment ID and full comment content for evaluation. The moderator can see the parent post context to understand the discussion thread where the violation occurred.
 *
 * 1. Create a member account who will serve as community moderator.
 * 2. Create a new community with unique name and description.
 * 3. Add the member as moderator to the community.
 * 4. Create a text post in the community.
 * 5. Create a comment on the post that will be reported.
 * 6. Submit a report targeting the comment with violation reason.
 * 7. Retrieve the report as moderator and validate complete details.
 * 8. Verify reporter identity, reason text, pending status, and comment content.
 */
export async function test_api_report_retrieval_for_comment_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(moderator);
  // 2. Create community
  const community = await generate_random_reddit_like_member_communities_create(
    moderatorConnection,
    {
      body: {
        name: `${RandomGenerator.name(1)}_${typia.random<string & tags.Format<"uuid">>()}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Create another member who will post content to be reported
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(reporter);
  // 4. Add reporter as moderator (so they can create posts - subscription required)
  await generate_random_reddit_like_member_communities_moderators_create(
    moderatorConnection,
    {
      params: { communityId: community.id },
      body: {
        member_id: reporter.id,
      } satisfies IRedditLikeCommunityModerator.ICreate,
    },
  );
  // 5. Create a post in the community
  const post = await generate_random_reddit_like_member_posts_create(
    reporterConnection,
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
  // 6. Create a comment on the post
  const comment =
    await generate_random_reddit_like_member_posts_comments_create(
      reporterConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  typia.assert(comment);
  // 7. Create a report targeting the comment
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
  // 8. Retrieve the report as moderator
  const retrievedReport = await api.functional.redditLike.member.reports.at(
    moderatorConnection,
    {
      reportId: report.id,
    },
  );
  typia.assert(retrievedReport);
  // 9. Validate report details
  TestValidator.equals("report ID matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "actor type is comment",
    retrievedReport.actor_type,
    "comment",
  );
  TestValidator.equals(
    "report status is pending",
    retrievedReport.status,
    "pending",
  );
  TestValidator.equals(
    "reporter matches",
    retrievedReport.member.id,
    reporter.id,
  );
  // Validate comment target exists and matches - use assertGuard to narrow type
  typia.assertGuard(retrievedReport.commentTarget);
  TestValidator.equals(
    "comment ID matches",
    retrievedReport.commentTarget.id,
    comment.id,
  );
  // Validate the comment content is accessible - access nested comment property
  TestValidator.predicate(
    "comment content exists",
    retrievedReport.commentTarget.comment.content.length > 0,
  );
  TestValidator.equals(
    "reason matches",
    retrievedReport.reason,
    report.reason,
  );
}