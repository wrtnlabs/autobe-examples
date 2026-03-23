import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_posts_reports_create } from "../../../generate/generate_random_reddit_like_member_posts_reports_create";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

export async function test_api_post_reporting_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create reporter member
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await api.functional.redditLike.auth.member.join(
    reporterConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        displayName: RandomGenerator.name(),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(reporter);
  // 2. Create post author member and login
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await api.functional.redditLike.auth.member.join(
    authorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        displayName: RandomGenerator.name(),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(author);
  // Create post in community
  const post = await api.functional.redditLike.member.posts.create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.name(),
        type: "text",
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Login as reporter and create report
  const reportConnection: api.IConnection = { host: connection.host };
  await api.functional.redditLike.auth.member.login(reportConnection, {
    body: {
      email: reporter.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditLikeMember.ILogin,
  });
  const report = await api.functional.redditLike.member.posts.reports.create(
    reportConnection,
    {
      postId: post.id,
      body: {
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  // 4. Validate report
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals("reporter matches", report.reporter.id, reporter.id);
  TestValidator.equals(
    "reported post matches",
    report.reportedPost?.id,
    post.id,
  );
  TestValidator.equals("reason is provided", report.reason.length > 0, true);
  TestValidator.predicate(
    "has timestamps",
    () => !!report.created_at && !!report.updated_at,
  );
}