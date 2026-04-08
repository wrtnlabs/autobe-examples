import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostVote";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import type { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_reddit_clone_comments_votes_create } from "../../../generate/generate_random_reddit_clone_member_reddit_clone_comments_votes_create";
import { generate_random_reddit_clone_member_reddit_clone_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_reddit_clone_posts_comments_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_vote } from "../../../prepare/prepare_random_reddit_clone_post_vote";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_comment_votes_retrieval_with_multiple_votes(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member1 creates community, subscribes, creates post and comment
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {});
  const community =
    await generate_random_reddit_clone_member_communities_create(
      member1Connection,
      {},
    );
  typia.assert(community);
  await generate_random_reddit_clone_member_subscriptions_create(
    member1Connection,
    {
      body: {
        communityId: community.id,
      } satisfies IRedditCloneSubscription.ICreate,
    },
  );
  const post = await generate_random_reddit_clone_member_posts_create(
    member1Connection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "text",
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  const comment =
    await generate_random_reddit_clone_member_reddit_clone_posts_comments_create(
      member1Connection,
      {
        params: { postId: post.id },
        body: { content: RandomGenerator.paragraph({ sentences: 2 }) },
      },
    );
  typia.assert(comment);
  // Step 2: Member2 joins and upvotes the comment
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {});
  await generate_random_reddit_clone_member_subscriptions_create(
    member2Connection,
    {
      body: {
        communityId: community.id,
      } satisfies IRedditCloneSubscription.ICreate,
    },
  );
  const upvoteVote =
    await generate_random_reddit_clone_member_reddit_clone_comments_votes_create(
      member2Connection,
      {
        params: { commentId: comment.id },
        body: { direction: "upvote" },
      },
    );
  typia.assert(upvoteVote);
  // Step 3: Member3 joins and downvotes the comment
  const member3Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member3Connection, {});
  await generate_random_reddit_clone_member_subscriptions_create(
    member3Connection,
    {
      body: {
        communityId: community.id,
      } satisfies IRedditCloneSubscription.ICreate,
    },
  );
  const downvoteVote =
    await generate_random_reddit_clone_member_reddit_clone_comments_votes_create(
      member3Connection,
      {
        params: { commentId: comment.id },
        body: { direction: "downvote" },
      },
    );
  typia.assert(downvoteVote);
  // Step 4: Retrieve votes for the comment
  const votesResponse =
    await api.functional.redditClone.member.redditClone.comments.votes.iterate(
      member1Connection,
      {
        commentId: comment.id,
      },
    );
  typia.assert(votesResponse);
  // Step 5: Validate response
  TestValidator.equals(
    "total votes count",
    votesResponse.pagination.records,
    2,
  );
  TestValidator.equals("data length", votesResponse.data.length, 2);
  // Find upvote and downvote votes
  const upvoteVoteData = votesResponse.data.find(
    (v) => v.direction === "upvote",
  );
  const downvoteVoteData = votesResponse.data.find(
    (v) => v.direction === "downvote",
  );
  TestValidator.predicate("upvote vote exists", upvoteVoteData !== undefined);
  TestValidator.predicate(
    "downvote vote exists",
    downvoteVoteData !== undefined,
  );
  if (upvoteVoteData) {
    TestValidator.predicate(
      "upvote has member info",
      upvoteVoteData.member !== undefined,
    );
    TestValidator.equals(
      "upvote has member username",
      typeof upvoteVoteData.member.username,
      "string",
    );
    TestValidator.equals(
      "upvote direction",
      upvoteVoteData.direction,
      "upvote",
    );
  }
  if (downvoteVoteData) {
    TestValidator.predicate(
      "downvote has member info",
      downvoteVoteData.member !== undefined,
    );
    TestValidator.equals(
      "downvote has member username",
      typeof downvoteVoteData.member.username,
      "string",
    );
    TestValidator.equals(
      "downvote direction",
      downvoteVoteData.direction,
      "downvote",
    );
  }
  // Validate ordering: most recent first (created_at descending)
  for (let i = 0; i < votesResponse.data.length - 1; i++) {
    const current = new Date(votesResponse.data[i].createdAt).getTime();
    const next = new Date(votesResponse.data[i + 1].createdAt).getTime();
    TestValidator.predicate(
      `vote at index ${i} is more recent than vote at index ${i + 1}`,
      current >= next,
    );
  }
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination exists",
    votesResponse.pagination !== undefined,
  );
  TestValidator.equals(
    "pagination records matches data length",
    votesResponse.pagination.records,
    votesResponse.data.length,
  );
}
