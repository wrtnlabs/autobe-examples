import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import type { IRedditLikeSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

export async function test_api_member_report_post_success(
  connection: api.IConnection,
): Promise<void> {
  // Member A (reporter) registration and subscription
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: "1234",
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(reporterAuth);
  // Member A subscribes to a community
  const communityName = RandomGenerator.alphaNumeric(6);
  const subscription =
    await api.functional.redditLike.member.communities.subscribe.create(
      reporterConnection,
      { communityName },
    );
  typia.assert(subscription);
  // Member B (post creator) registration
  const creatorConnection: api.IConnection = { host: connection.host };
  const creatorAuth = await authorize_member_join(creatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: "1234",
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(creatorAuth);
  // Member B subscribes to the same community
  await api.functional.redditLike.member.communities.subscribe.create(
    creatorConnection,
    { communityName },
  );
  // Member B creates a post in the community
  const post = await api.functional.redditLike.member.posts.create(
    creatorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text" as const,
        content: RandomGenerator.content({ paragraphs: 2 }),
        community_id: subscription.community.id,
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // Member A reports the post
  const report = await api.functional.redditLike.member.reports.create(
    reporterConnection,
    {
      body: {
        reported_post_id: post.id,
        reason: "This post contains inappropriate content",
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  // Verify report details
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals(
    "reported post matches",
    report.reportedPost?.id,
    post.id,
  );
  TestValidator.equals("reporter matches", report.reporter.id, reporterAuth.id);
  TestValidator.predicate("has report ID", report.id.length > 0);
  void TestValidator.predicate(
    "has timestamps",
    !!report.created_at && !!report.updated_at,
  );
}