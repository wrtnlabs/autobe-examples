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
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

export async function test_api_report_retrieval_with_reported_comment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and login as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(2),
      display_name: RandomGenerator.name(),
      password: "1234",
      bio: null,
      avatar_url: null,
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IRedditLikeModerator.IJoin,
  });
  const moderatorLoginConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_login(moderatorLoginConnection, {
    body: {
      email: typia.assert<string & tags.Format<"email"> & tags.MaxLength<255>>(moderator.email),
      password: "1234",
    } satisfies IRedditLikeModerator.ILogin,
  });
  // 2. Create and login as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(2),
      password: "1234",
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: typia.assert<string & tags.Format<"email"> & tags.MaxLength<255>>(member.email),
      password: "1234",
    } satisfies IRedditLikeMember.ILogin,
  });
  // 3. Create community first
  const communityName = `community_${RandomGenerator.alphaNumeric(8)}`;
  await api.functional.redditLike.member.communities.subscribe.create(
    memberLoginConnection,
    {
      communityName,
    },
  );
  // Get community info to get community_id
  const communityList =
    await api.functional.redditLike.member.communities.subscribe.create(
      memberLoginConnection,
      {
        communityName,
      },
    );
  typia.assert(communityList);
  // 4. Create post
  const post = await api.functional.redditLike.member.posts.create(
    memberLoginConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text" as const,
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        community_id: communityList.community.id,
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create comment
  const comment = await api.functional.redditLike.member.posts.comments.create(
    memberLoginConnection,
    {
      postId: post.id,
      body: {
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(comment);
  // 6. File report on comment
  const report = await api.functional.redditLike.member.reports.create(
    memberLoginConnection,
    {
      body: {
        reported_comment_id: comment.id,
        reason:
          "This comment contains inappropriate content that violates community guidelines.",
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  // 7. Retrieve report as moderator
  const retrievedReport = await api.functional.redditLike.moderator.reports.at(
    moderatorLoginConnection,
    {
      reportId: report.id,
    },
  );
  typia.assert(retrievedReport);
  // Validation checks
  TestValidator.equals("report ID matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "report status is pending",
    retrievedReport.status,
    "pending",
  );
  TestValidator.equals(
    "report reason matches",
    retrievedReport.reason,
    report.reason,
  );
  TestValidator.equals(
    "reporter is the member",
    retrievedReport.reporter.id,
    member.id,
  );
  TestValidator.notEquals(
    "comment exists",
    retrievedReport.reportedComment,
    null,
  );
  TestValidator.equals(
    "comment content matches",
    retrievedReport.reportedComment?.content,
    comment.content,
  );
  TestValidator.equals(
    "comment author is the member",
    retrievedReport.reportedComment?.author.id,
    member.id,
  );
  TestValidator.equals(
    "post exists in comment",
    retrievedReport.reportedComment?.post.id,
    post.id,
  );
  TestValidator.equals(
    "post title matches",
    retrievedReport.reportedComment?.post.title,
    post.title,
  );
}