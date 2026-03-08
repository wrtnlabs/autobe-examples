import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformComment";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_comments_create } from "../../../generate/generate_random_reddit_platform_member_comments_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_subscribe } from "../../../generate/generate_random_reddit_platform_member_communities_subscribe";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_comment_list_bests_new_controversial_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Join member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Step 2: Create community
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<1>>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // Step 3: Subscribe member to community
  await api.functional.redditPlatform.member.communities.subscribe(
    memberConnection,
    {
      communityId: community.id,
      body: { confirmSubscription: true },
    },
  );
  // Step 4: Create TEXT post
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "TEXT",
        redditPlatformCommunityId: community.id,
        content: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(post);
  // Step 5: Create multiple members for voting and comments
  const otherMembers = await ArrayUtil.asyncRepeat(6, async () => {
    const otherConnection: api.IConnection = { host: connection.host };
    const otherAuth = await authorize_member_join(otherConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
    typia.assert(otherAuth);
    return { connection: otherConnection, auth: otherAuth };
  });
  // Create comments at different timestamps
  const commentIds: string[] = [];
  // Wait 100ms between each comment to ensure different timestamps
  for (let i = 0; i < 8; i++) {
    const comment = await api.functional.redditPlatform.member.comments.create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          post_id: post.id,
        },
      },
    );
    typia.assert(comment);
    commentIds.push(comment.id);
    // Sleep between comments to ensure different timestamps
    if (i < 7) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  // Apply votes on comments (some upvotes, some downvotes, some controversial)
  const votesToCast = [
    { commentId: commentIds[0], voteType: typia.assert<"upvote" | "downvote">("upvote") },
    { commentId: commentIds[1], voteType: typia.assert<"upvote" | "downvote">("upvote") },
    { commentId: commentIds[2], voteType: typia.assert<"upvote" | "downvote">("upvote") },
    { commentId: commentIds[3], voteType: typia.assert<"upvote" | "downvote">("downvote") },
    { commentId: commentIds[4], voteType: typia.assert<"upvote" | "downvote">("downvote") },
    { commentId: commentIds[5], voteType: typia.assert<"upvote" | "downvote">("upvote") },
    { commentId: commentIds[6], voteType: typia.assert<"upvote" | "downvote">("downvote") }, // controversial: 1 up, 1 down
    { commentId: commentIds[6], voteType: typia.assert<"upvote" | "downvote">("downvote") }, // second vote on same comment
  ];
  // Apply votes sequentially
  for (let i = 0; i < votesToCast.length; i++) {
    const vote = votesToCast[i];
    const voterMember = otherMembers[i % otherMembers.length];
    await api.functional.redditPlatform.member.comments.votes.vote(
      voterMember.connection,
      {
        commentId: vote.commentId,
        body: { vote_type: vote.voteType },
      },
    );
  }
  // Step 6: Test BEST sorting
  const bestComments = await api.functional.redditPlatform.posts.comments.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        sortType: "BEST",
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(bestComments);
  // Validate BEST sorting: vote_score DESC, then created_at DESC
  TestValidator.equals(
    "BEST: page current",
    bestComments.pagination.current,
    1,
  );
  TestValidator.equals("BEST: page limit", bestComments.pagination.limit, 20);
  TestValidator.equals(
    "BEST: total records",
    bestComments.pagination.records,
    commentIds.length,
  );
  TestValidator.equals("BEST: pages", bestComments.pagination.pages, 1);
  // Best sorting should have highest vote_score first
  for (let i = 1; i < bestComments.data.length; i++) {
    const prev = bestComments.data[i - 1];
    const curr = bestComments.data[i];
    if (prev.vote_score === curr.vote_score) {
      // If vote scores are equal, created_at should be DESC
      TestValidator.predicate(
        `BEST: equal scores, older first (${i})`,
        new Date(prev.created_at) >= new Date(curr.created_at),
      );
    } else {
      // Otherwise vote_score should be DESC
      TestValidator.predicate(
        `BEST: score DESC (${i})`,
        prev.vote_score > curr.vote_score,
      );
    }
  }
  // Step 7: Test NEW sorting
  const newComments = await api.functional.redditPlatform.posts.comments.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        sortType: "NEW",
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(newComments);
  TestValidator.equals("NEW: page current", newComments.pagination.current, 1);
  TestValidator.equals("NEW: page limit", newComments.pagination.limit, 20);
  TestValidator.equals(
    "NEW: total records",
    newComments.pagination.records,
    commentIds.length,
  );
  TestValidator.equals("NEW: pages", newComments.pagination.pages, 1);
  // NEW sorting should be by created_at DESC
  for (let i = 1; i < newComments.data.length; i++) {
    const prev = newComments.data[i - 1];
    const curr = newComments.data[i];
    TestValidator.predicate(
      `NEW: created_at DESC (${i})`,
      new Date(prev.created_at) >= new Date(curr.created_at),
    );
  }
  // Step 8: Test CONTROVERSIAL sorting
  const controversialComments =
    await api.functional.redditPlatform.posts.comments.index(memberConnection, {
      postId: post.id,
      body: {
        sortType: "CONTROVERSIAL",
        page: 1,
        limit: 20,
      },
    });
  typia.assert(controversialComments);
  TestValidator.equals(
    "CONTROVERSIAL: page current",
    controversialComments.pagination.current,
    1,
  );
  TestValidator.equals(
    "CONTROVERSIAL: page limit",
    controversialComments.pagination.limit,
    20,
  );
  TestValidator.equals(
    "CONTROVERSIAL: total records",
    controversialComments.pagination.records,
    commentIds.length,
  );
  TestValidator.equals(
    "CONTROVERSIAL: pages",
    controversialComments.pagination.pages,
    1,
  );
  // Controversial sorting should prioritize comments with low net score (near zero)
  // but potentially high vote counts. Using ABS(vote_score) ordering ASC.
  // For simplicity, we verify that low vote_score comments appear before high ones.
  for (let i = 1; i < controversialComments.data.length; i++) {
    const prev = controversialComments.data[i - 1];
    const curr = controversialComments.data[i];
    const prevAbs = Math.abs(prev.vote_score);
    const currAbs = Math.abs(curr.vote_score);
    TestValidator.predicate(
      `CONTROVERSIAL: abs(vote_score) ASC (${i})`,
      prevAbs <= currAbs,
    );
  }
}