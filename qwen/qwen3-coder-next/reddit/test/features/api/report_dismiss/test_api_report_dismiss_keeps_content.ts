import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
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
import { generate_random_reddit_like_member_comments_reports_create } from "../../../generate/generate_random_reddit_like_member_comments_reports_create";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

export async function test_api_report_dismiss_keeps_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    },
  });
  // 2. Auth as member to create community
  await authorize_member_login(memberConnection, {
    body: {
      email: member.email,
      password: "1234",
    } satisfies IRedditLikeMember.ILogin,
  });
  // 3. Create community
  const community = await api.functional.redditLike.member.communities.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(1),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 4. Create post
  const post = await api.functional.redditLike.member.posts.create(
    memberConnection,
    {
      body: {
        title: "Test post title",
        type: "text" as const,
        content: "Test post content",
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create comment
  const comment = await api.functional.redditLike.member.posts.comments.create(
    memberConnection,
    {
      postId: post.id,
      body: {
        content: "Reported comment content",
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(comment);
  // 6. Auth as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    },
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: (admin as any).email,
      password: "1234",
    } satisfies IRedditLikeAdmin.ILogin,
  });
  // 7. Create pending report for the comment
  const reporterConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(reporterConnection, {
    body: {
      email: member.email,
      password: "1234",
    } satisfies IRedditLikeMember.ILogin,
  });
  const report = await api.functional.redditLike.member.comments.reports.create(
    reporterConnection,
    {
      commentId: comment.id,
      body: {
        reason: "Spam content",
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  TestValidator.equals("report is pending", report.status, "pending");
  // 8. Admin dismisses report
  const dismissedReport = await api.functional.redditLike.admin.reports.update(
    adminConnection,
    {
      reportId: report.id,
      body: {
        status: "dismissed" as const,
      } satisfies IRedditLikeReport.IUpdate,
    },
  );
  typia.assert(dismissedReport);
  // 9. Validate results
  TestValidator.equals(
    "report status is dismissed",
    dismissedReport.status,
    "dismissed",
  );
  TestValidator.equals(
    "reported comment matches",
    dismissedReport.reportedComment?.id,
    comment.id,
  );
}