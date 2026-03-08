import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_comment_history_sort_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create author member who will write comments
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: `author_${RandomGenerator.alphaNumeric(6)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorAuth);
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {
        body: {
          name: `community_${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to the community
  await generate_random_community_platform_member_subscriptions_create(
    authorConnection,
    {
      body: { community_id: community.id },
    },
  );
  // 4. Create multiple posts
  const posts = await ArrayUtil.asyncRepeat(3, async () => {
    const post = await generate_random_community_platform_member_posts_create(
      authorConnection,
      {
        body: {
          communityId: community.id,
          title: RandomGenerator.paragraph({ sentences: 1 }),
          contentType: "text",
          textContent: RandomGenerator.paragraph({ sentences: 5 }),
          linkUrl: null,
          imageUrl: null,
        },
      },
    );
    typia.assert(post);
    return post;
  });
  // 5. Create comments with varying content
  const comments = await ArrayUtil.asyncRepeat(5, async (index) => {
    const post = posts[index % posts.length];
    const comment =
      await generate_random_community_platform_member_posts_comments_create(
        authorConnection,
        {
          params: { postId: post.id },
          body: {
            content: RandomGenerator.paragraph({ sentences: 3 }),
          },
        },
      );
    typia.assert(comment);
    return comment;
  });
  // 6. Create additional members to vote on comments
  const voterConnections = await ArrayUtil.asyncRepeat(5, async () => {
    const voterConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(voterConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: `voter_${RandomGenerator.alphaNumeric(6)}`,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
    return voterConnection;
  });
  // 7. Cast varying votes on comments to create different score distributions
  // First 2 comments: high upvotes
  for (const voterConn of voterConnections) {
    // Upvote comment 0 and 1
    await api.functional.communityPlatform.member.comments.vote(voterConn, {
      commentId: comments[0].id,
      body: { voteType: "upvote" },
    });
    await api.functional.communityPlatform.member.comments.vote(voterConn, {
      commentId: comments[1].id,
      body: { voteType: "upvote" },
    });
  }
  // Comment 2: mixed votes (controversial)
  for (let i = 0; i < voterConnections.length; i++) {
    const voterConn = voterConnections[i];
    if (i < 3) {
      await api.functional.communityPlatform.member.comments.vote(voterConn, {
        commentId: comments[2].id,
        body: { voteType: "upvote" },
      });
    } else {
      await api.functional.communityPlatform.member.comments.vote(voterConn, {
        commentId: comments[2].id,
        body: { voteType: "downvote" },
      });
    }
  }
  // Comment 3: mostly downvotes (negative score)
  for (let i = 0; i < voterConnections.length; i++) {
    const voterConn = voterConnections[i];
    if (i < 4) {
      await api.functional.communityPlatform.member.comments.vote(voterConn, {
        commentId: comments[3].id,
        body: { voteType: "downvote" },
      });
    } else {
      await api.functional.communityPlatform.member.comments.vote(voterConn, {
        commentId: comments[3].id,
        body: { voteType: "upvote" },
      });
    }
  }
  // Comment 4: neutral (no additional votes beyond self-vote)
  // Wait a bit to ensure all timestamps are distinct
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 8. Test 'best' sort - should order by score DESC
  const bestSortResult =
    await api.functional.communityPlatform.member.comments.history(
      authorConnection,
      {
        body: {
          authorId: authorAuth.id,
          sort: "best",
          limit: 10,
        },
      },
    );
  typia.assert(bestSortResult);
  // Validate 'best' sort order - highest scores first
  const bestScores = bestSortResult.data.map((c) => c.score);
  for (let i = 0; i < bestScores.length - 1; i++) {
    TestValidator.predicate(
      `best sort: score[${i}] >= score[${i + 1}]`,
      bestScores[i] >= bestScores[i + 1],
    );
  }
  // 9. Test 'new' sort - should order by created_at DESC
  const newSortResult =
    await api.functional.communityPlatform.member.comments.history(
      authorConnection,
      {
        body: {
          authorId: authorAuth.id,
          sort: "new",
          limit: 10,
        },
      },
    );
  typia.assert(newSortResult);
  // Validate 'new' sort order - most recent first
  const newDates = newSortResult.data.map((c) =>
    new Date(c.createdAt).getTime(),
  );
  for (let i = 0; i < newDates.length - 1; i++) {
    TestValidator.predicate(
      `new sort: createdAt[${i}] >= createdAt[${i + 1}]`,
      newDates[i] >= newDates[i + 1],
    );
  }
  // 10. Test 'controversial' sort - high engagement with mixed votes
  const controversialSortResult =
    await api.functional.communityPlatform.member.comments.history(
      authorConnection,
      {
        body: {
          authorId: authorAuth.id,
          sort: "controversial",
          limit: 10,
        },
      },
    );
  typia.assert(controversialSortResult);
  // 11. Verify all comments are visible in all sort results
  TestValidator.equals(
    "all comments visible in best sort",
    bestSortResult.data.length,
    comments.length,
  );
  TestValidator.equals(
    "all comments visible in new sort",
    newSortResult.data.length,
    comments.length,
  );
  TestValidator.equals(
    "all comments visible in controversial sort",
    controversialSortResult.data.length,
    comments.length,
  );
  // 12. Verify author data is accurate across sort results
  for (const comment of bestSortResult.data) {
    TestValidator.equals(
      "author matches in best sort",
      comment.author.id,
      authorAuth.id,
    );
  }
  for (const comment of newSortResult.data) {
    TestValidator.equals(
      "author matches in new sort",
      comment.author.id,
      authorAuth.id,
    );
  }
  // 13. Verify pagination works
  const paginatedResult =
    await api.functional.communityPlatform.member.comments.history(
      authorConnection,
      {
        body: {
          authorId: authorAuth.id,
          sort: "best",
          page: 1,
          limit: 2,
        },
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination limit works",
    paginatedResult.data.length,
    2,
  );
  TestValidator.predicate(
    "pagination records count is correct",
    paginatedResult.pagination.records >= comments.length,
  );
}
