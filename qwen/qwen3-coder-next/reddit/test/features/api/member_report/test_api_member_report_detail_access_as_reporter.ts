import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
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
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_posts_reports_create } from "../../../generate/generate_random_reddit_like_member_posts_reports_create";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

export async function test_api_member_report_detail_access_as_reporter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create reporter (member who creates post and later retrieves report)
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
  // 2. Create reporter B (member who reports the post)
  const reporterBConnection: api.IConnection = { host: connection.host };
  const reporterB = await api.functional.redditLike.auth.member.join(
    reporterBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        displayName: RandomGenerator.name(),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(reporterB);
  // 3. Reporter creates a post in a community
  const post = await api.functional.redditLike.member.posts.create(
    reporterConnection,
    {
      body: {
        title: RandomGenerator.name(2),
        type: "text",
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Reporter B reports the post
  const report = await api.functional.redditLike.member.posts.reports.create(
    reporterBConnection,
    {
      postId: post.id,
      body: {
        reason: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  // 5. Reporter (original post creator) retrieves their own report details
  reporterConnection.headers = { Authorization: reporter.token.access };
  const retrievedReport = await api.functional.redditLike.moderator.reports.at(
    reporterConnection,
    {
      reportId: report.id,
    },
  );
  typia.assert(retrievedReport);
  // 6. Validate report accessibility
  TestValidator.equals(
    "reporter matches",
    retrievedReport.reporter.id,
    reporterB.id,
  );
  TestValidator.equals(
    "reported post matches",
    retrievedReport.reportedPost?.id,
    post.id,
  );
}
