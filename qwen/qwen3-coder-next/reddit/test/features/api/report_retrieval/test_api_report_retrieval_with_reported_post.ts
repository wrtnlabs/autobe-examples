import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
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
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

export async function test_api_report_retrieval_with_reported_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator account and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinResult = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(2),
        display_name: RandomGenerator.name(),
        password: "12345678",
        bio: null,
        avatar_url: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeModerator.IJoin,
    },
  );
  await authorize_moderator_login(moderatorConnection, {
    body: {
      email: (moderatorJoinResult.email as unknown) as string & tags.MaxLength<255> & tags.Format<"email">,
      password: "12345678",
    } satisfies IRedditLikeModerator.ILogin,
  });
  // 2. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(2),
      display_name: RandomGenerator.name(),
      password: "12345678",
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  await authorize_member_login(memberConnection, {
    body: {
      email: (memberJoinResult.email as unknown) as string & tags.MaxLength<255> & tags.Format<"email">,
      password: "12345678",
    } satisfies IRedditLikeMember.ILogin,
  });
  // 3. Member subscribes to a community
  const communityName = `community_${RandomGenerator.alphabets(8)}`;
  const subscription =
    await api.functional.redditLike.member.communities.subscribe.create(
      memberConnection,
      {
        communityName,
      },
    );
  typia.assert(subscription);
  // 4. Member creates a post
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
        content: RandomGenerator.content({ paragraphs: 2 }),
        url: null,
        image_url: null,
        community_id: subscription.community.id,
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Member files a report on the post
  const report = await generate_random_reddit_like_member_reports_create(
    memberConnection,
    {
      body: {
        reported_post_id: post.id,
        reported_comment_id: null,
        reason: "This post contains inappropriate content.",
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  // 6. Moderator retrieves the report
  const retrievedReport = await api.functional.redditLike.moderator.reports.at(
    moderatorConnection,
    {
      reportId: report.id,
    },
  );
  typia.assert(retrievedReport);
  // 7. Validate report contains full post summary
  TestValidator.equals("report id matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "report reason matches",
    retrievedReport.reason,
    report.reason,
  );
  TestValidator.equals(
    "report status is pending",
    retrievedReport.status,
    "pending",
  );
  TestValidator.predicate(
    "reporter info exists",
    retrievedReport.reporter.id !== undefined,
  );
  TestValidator.predicate(
    "reported post exists",
    retrievedReport.reportedPost !== null &&
      retrievedReport.reportedPost !== undefined,
  );
  TestValidator.equals(
    "reported post id matches",
    retrievedReport.reportedPost?.id,
    post.id,
  );
  TestValidator.equals(
    "reported post title matches",
    retrievedReport.reportedPost?.title,
    post.title,
  );
  TestValidator.equals(
    "reported post author matches",
    retrievedReport.reportedPost?.author.id,
    post.author.id,
  );
  TestValidator.equals(
    "reported post community matches",
    retrievedReport.reportedPost?.community.id,
    post.community.id,
  );
  TestValidator.equals(
    "reported post score matches",
    retrievedReport.reportedPost?.score,
    post.score,
  );
  TestValidator.equals(
    "reported post comment count matches",
    retrievedReport.reportedPost?.comment_count,
    post.comment_count,
  );
}