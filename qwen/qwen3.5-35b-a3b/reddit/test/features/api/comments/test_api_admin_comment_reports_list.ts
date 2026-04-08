import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
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

export async function test_api_admin_comment_reports_list(
  connection: api.IConnection,
): Promise<void> {
  const communitySummary = typia.random<IRedditCommunityCommunity.ISummary>();
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuth);
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(memberAuth);
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(memberConnection, {
      body: {
        title: RandomGenerator.name(3),
        post_type: "text",
        reddit_community_community_id: communitySummary.id,
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditCommunityPost.ICreate,
    });
  typia.assert(post);
  const comment: IRedditCommunityComment =
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
  const report: IRedditCommunityCommentReport =
    await api.functional.redditCommunity.member.posts.comments.reports.create(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommentReport.ICreate,
      },
    );
  typia.assert(report);
  const response =
    await api.functional.redditCommunity.admin.posts.comments.reports.index(
      adminConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {},
      },
    );
  typia.assert(response);
  TestValidator.predicate(
    "pagination current page valid",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    response.pagination.limit >= 1,
  );
  TestValidator.equals("report list length", response.data.length, 1);
  const reportItem = response.data[0];
  typia.assert(reportItem);
  TestValidator.equals(
    "report id matches submitted report",
    reportItem.id,
    report.id,
  );
  TestValidator.equals(
    "reporter id matches member",
    reportItem.reporter.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "reporter username matches member",
    reportItem.reporter.username,
    memberAuth.username,
  );
  TestValidator.equals(
    "report reason matches submitted reason",
    reportItem.reason,
    report.reason,
  );
  TestValidator.equals(
    "comment id in report matches target comment",
    reportItem.targetComment!.id,
    comment.id,
  );
  TestValidator.equals(
    "comment content preserved in report",
    reportItem.targetComment!.content,
    comment.content,
  );
  TestValidator.equals(
    "community in report matches post community",
    reportItem.community.id,
    post.community.id,
  );
  TestValidator.predicate(
    "status_id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      reportItem.status_id,
    ),
  );
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(Date.parse(reportItem.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(Date.parse(reportItem.updated_at)),
  );
}
