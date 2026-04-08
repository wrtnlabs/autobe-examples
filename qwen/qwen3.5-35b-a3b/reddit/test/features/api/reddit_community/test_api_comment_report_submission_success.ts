import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_comments_reports_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_reports_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_comment_report } from "../../../prepare/prepare_random_reddit_community_comment_report";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";

export async function test_api_comment_report_submission_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A (reporter)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAAuth);
  // 2. Create Member B (comment author - different user)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberBAuth);
  // 3. Generate a valid community for post creation
  const testCommunity: IRedditCommunityCommunity.ISummary =
    typia.random<IRedditCommunityCommunity.ISummary>();
  // 4. Member A creates a post in the community
  const post = await api.functional.redditCommunity.member.posts.create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text" as const,
        reddit_community_community_id: testCommunity.id,
        text_content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Member B creates a comment on the post
  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      memberBConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);
  // 6. Member A submits a report on Member B's comment
  const reportReason = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 2,
    wordMax: 6,
  });
  const report =
    await api.functional.redditCommunity.member.posts.comments.reports.create(
      memberAConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          reason: reportReason,
        } satisfies IRedditCommunityCommentReport.ICreate,
      },
    );
  typia.assert(report);
  // 7. Validate report response
  TestValidator.equals("report status", report.status, "pending");
  TestValidator.equals("report reason", report.reason, reportReason);
  TestValidator.equals("report comment ID", report.comment.id, comment.id);
  TestValidator.equals(
    "report reporter ID",
    report.reporter.id,
    memberAAuth.id,
  );
  TestValidator.equals(
    "report community ID",
    report.community.id,
    testCommunity.id,
  );
  TestValidator.equals("report deleted_at", report.deleted_at, null);
  TestValidator.notEquals(
    "report created at",
    report.created_at,
    report.updated_at,
  );
  // 8. Validate comment is still visible (not deleted after report)
  TestValidator.equals("comment not deleted", comment.deleted_at, null);
}
