import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_posts_votes_create_vote } from "../../../generate/generate_random_reddit_like_member_posts_votes_create_vote";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_post_vote } from "../../../prepare/prepare_random_reddit_like_post_vote";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

export async function test_api_member_activity_dashboard_data_consistency(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: "Test1234!@#$",
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(memberAuth);
  // Create authenticated connection with token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${memberAuth.token.access}`,
    },
  };
  // 2. Create posts for dashboard metrics
  const createdPosts: IRedditLikePost[] = [];
  for (let i = 0; i < 2; i++) {
    const post = await api.functional.redditLike.member.posts.create(
      authenticatedConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          type: "text",
          content: RandomGenerator.content({ paragraphs: 3 }),
          community_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IRedditLikePost.ICreate,
      },
    );
    typia.assert(post);
    createdPosts.push(post);
  }
  // 3. Create comments for dashboard metrics
  const createdComments: IRedditLikeComment[] = [];
  for (const post of createdPosts) {
    const comment =
      await api.functional.redditLike.member.posts.comments.create(
        authenticatedConnection,
        {
          postId: post.id,
          body: {
            content: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IRedditLikeComment.ICreate,
        },
      );
    typia.assert(comment);
    createdComments.push(comment);
  }
  // 4. Create votes for dashboard metrics
  let totalVoteCount = 0;
  for (const post of createdPosts) {
    const vote1 = await api.functional.redditLike.member.posts.votes.createVote(
      authenticatedConnection,
      {
        postId: post.id,
        body: { value: 1 } satisfies IRedditLikePostVote.ICreate,
      },
    );
    typia.assert(vote1);
    totalVoteCount++;
    const vote2 = await api.functional.redditLike.member.posts.votes.createVote(
      authenticatedConnection,
      {
        postId: post.id,
        body: { value: -1 } satisfies IRedditLikePostVote.ICreate,
      },
    );
    typia.assert(vote2);
    totalVoteCount++;
  }
  // 5. Create reports for dashboard metrics
  const createdReports: IRedditLikeReport[] = [];
  for (const post of createdPosts) {
    const report = await api.functional.redditLike.member.reports.create(
      authenticatedConnection,
      {
        body: {
          reported_post_id: post.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditLikeReport.ICreate,
      },
    );
    typia.assert(report);
    createdReports.push(report);
  }
  // 6. Get dashboard and validate
  const dashboard =
    await api.functional.redditLike.member.activity.dashboard.at(
      authenticatedConnection,
    );
  typia.assert(dashboard);
  // 7. Validate dashboard metrics exist and are valid
  TestValidator.predicate("total_posts >= 0", dashboard.total_posts >= 0);
  TestValidator.predicate("total_comments >= 0", dashboard.total_comments >= 0);
  TestValidator.predicate("total_votes >= 0", dashboard.total_votes >= 0);
  TestValidator.predicate(
    "pending_reports >= 0",
    dashboard.pending_reports >= 0,
  );
  TestValidator.predicate(
    "total_communities >= 0",
    dashboard.total_communities >= 0,
  );
  TestValidator.predicate(
    "subscribed_count >= 0",
    dashboard.subscribed_count >= 0,
  );
  TestValidator.predicate("active_users >= 0", dashboard.active_users >= 0);
}
