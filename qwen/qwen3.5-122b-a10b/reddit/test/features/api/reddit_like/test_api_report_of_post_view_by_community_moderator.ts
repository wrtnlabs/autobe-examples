import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
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
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

/**
 * Test community moderator view of reported post content.
 *
 * Validates that a community moderator (owner) can successfully retrieve and view a content report targeting a post in their community. The test verifies the complete moderation workflow from report submission to moderator review access.
 *
 * The test ensures that moderators can access the full context needed to evaluate reported content, including the report reason, reporter identity, and the complete post details.
 *
 * 1. Create and authenticate a member account who will own the community.
 * 2. Create a community where the member automatically becomes the owner.
 * 3. Create a text post in the community that will be reported.
 * 4. Create a content report on the post with a violation reason.
 * 5. Retrieve the report using the reportOfPostId path parameter from the report's postTarget.
 * 6. Validate the response contains all required fields including reason, status, reporter, and post details.
 */
export async function test_api_report_of_post_view_by_community_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Create community (member becomes owner automatically)
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {
      body: {
        name: `community-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Create a post in the community
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
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
  // 4. Create a content report on the post
  const report = await generate_random_reddit_like_member_reports_create(
    memberConnection,
    {
      body: {
        targetType: "post",
        targetId: post.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  // 5. Retrieve the report using the reportOfPostId from postTarget
  // The report object contains postTarget which is the IRedditLikeReportOfPost linkage record
  const reportOfPost =
    await api.functional.redditLike.member.reports_of_posts.at(
      memberConnection,
      {
        reportOfPostId: report.postTarget.id,
      },
    );
  typia.assert(reportOfPost);
  // 6. Validate the response
  TestValidator.equals(
    "report reason matches",
    reportOfPost.reason,
    report.reason,
  );
  TestValidator.predicate(
    "status is pending",
    reportOfPost.status === "pending",
  );
  TestValidator.equals(
    "reporter is member",
    reportOfPost.reporter.id,
    member.id,
  );
  TestValidator.equals("post matches", reportOfPost.post.id, post.id);
  TestValidator.equals(
    "post title matches",
    reportOfPost.post.title,
    post.title,
  );
}
