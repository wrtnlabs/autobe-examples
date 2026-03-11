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
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_posts_reports_create } from "../../../generate/generate_random_reddit_like_member_posts_reports_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

export async function test_api_moderator_report_detail_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator who owns a community
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorPassword = RandomGenerator.alphaNumeric(16);
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: moderatorPassword,
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(moderator);
  const community = await generate_random_reddit_like_member_communities_create(
    moderatorConnection,
    {
      body: {
        name: RandomGenerator.alphabets(8),
      },
    },
  );
  typia.assert(community);
  // 2. Create member and post in community
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "text" as const,
        content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 3. Create another member and submit report
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(reporter);
  const report = await generate_random_reddit_like_member_posts_reports_create(
    reporterConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      },
      params: { postId: post.id },
    },
  );
  typia.assert(report);
  // 4. Authenticate as moderator and retrieve report
  const moderatorLoginConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_moderator_login(moderatorLoginConnection, {
    body: {
      email: moderator.email,
      password: moderatorPassword,
    },
  });
  const retrievedReport = await api.functional.redditLike.moderator.reports.at(
    moderatorLoginConnection,
    {
      reportId: report.id,
    },
  );
  typia.assert(retrievedReport);
  // 5. Validate report details
  TestValidator.equals("report ID matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "reporter matches",
    retrievedReport.reporter.id,
    reporter.id,
  );
  TestValidator.equals(
    "reported post matches",
    retrievedReport.reportedPost?.id,
    post.id,
  );
  TestValidator.equals("reason matches", retrievedReport.reason, report.reason);
  TestValidator.equals("status is pending", retrievedReport.status, "pending");
  TestValidator.predicate(
    "has created_at",
    retrievedReport.created_at !== undefined,
  );
  TestValidator.predicate(
    "has updated_at",
    retrievedReport.updated_at !== undefined,
  );
}
