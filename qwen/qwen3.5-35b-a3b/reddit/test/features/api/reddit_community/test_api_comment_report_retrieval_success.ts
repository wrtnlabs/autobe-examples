import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
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

export async function test_api_comment_report_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestAdmin@123",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(admin);
  // 2. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestMember@123",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 3. Generate a valid community ID (community creation API is not available)
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Create a post in the community
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text" as const,
        reddit_community_community_id: communityId,
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create a comment on the post
  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);
  // 6. Submit a report on the comment
  const report =
    await api.functional.redditCommunity.member.posts.comments.reports.create(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          reason: "Spam content detected",
        } satisfies IRedditCommunityCommentReport.ICreate,
      },
    );
  typia.assert(report);
  // 7. Admin retrieves the report by ID
  const retrievedReport =
    await api.functional.redditCommunity.admin.posts.comments.reports.at(
      adminConnection,
      {
        postId: post.id,
        commentId: comment.id,
        reportId: report.id,
      },
    );
  typia.assert(retrievedReport);
  // 8. Validation
  TestValidator.equals("report ID matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "report reason matches",
    retrievedReport.reason,
    report.reason,
  );
  TestValidator.equals(
    "report status_id is 0 (pending)",
    retrievedReport.status_id,
    0,
  );
  TestValidator.equals(
    "report deleted_at is null (active)",
    retrievedReport.deleted_at,
    null,
  );
  TestValidator.equals(
    "reporter ID matches member",
    retrievedReport.reporter.id,
    member.id,
  );
  TestValidator.equals(
    "reporter username matches member",
    retrievedReport.reporter.username,
    member.username,
  );
  TestValidator.equals(
    "target comment ID matches",
    retrievedReport.targetComment!.id,
    comment.id,
  );
  TestValidator.equals(
    "target comment content matches",
    retrievedReport.targetComment!.content,
    comment.content,
  );
  TestValidator.predicate(
    "target comment vote_count is non-negative",
    retrievedReport.targetComment!.vote_count >= 0,
  );
  TestValidator.equals(
    "target post ID matches",
    retrievedReport.targetPost!.id,
    post.id,
  );
  TestValidator.equals(
    "target post title matches",
    retrievedReport.targetPost!.title,
    post.title,
  );
  TestValidator.equals(
    "target post type matches",
    retrievedReport.targetPost!.post_type,
    post.post_type as "text" | "link" | "image",
  );
  TestValidator.predicate(
    "target post vote_score is non-negative",
    retrievedReport.targetPost!.vote_score >= 0,
  );
  TestValidator.equals(
    "community ID matches",
    retrievedReport.community.id,
    post.community.id,
  );
  TestValidator.equals(
    "community name matches",
    retrievedReport.community.name,
    post.community.name,
  );
}
