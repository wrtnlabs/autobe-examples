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

export async function test_api_post_comments_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create member, community, subscription, post, and comments
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: RandomGenerator.alphaNumeric(10),
      displayName: RandomGenerator.name(),
      bio: null,
      avatarUrl: null,
      href: "https://example.com",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    },
  });
  // Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // Create subscription
  await generate_random_community_platform_member_subscriptions_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  // Create post
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
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
  // Create multiple comments with varied scores
  const commentCount = 6;
  const comments: ICommunityPlatformComment[] = [];
  for (let i = 0; i < commentCount; i++) {
    const comment =
      await generate_random_community_platform_member_posts_comments_create(
        memberConnection,
        {
          params: { postId: post.id },
          body: {
            content: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }
  // Create additional voters to set up score variations
  const voters = await ArrayUtil.asyncRepeat(5, async () => {
    const voterConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(voterConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
        username: RandomGenerator.alphaNumeric(10),
        displayName: RandomGenerator.name(),
        bio: null,
        avatarUrl: null,
        href: "https://example.com",
        referrer: "https://example.com",
        ip: "127.0.0.1",
      },
    });
    return voterConnection;
  });
  // Vote distribution to create varied scores:
  // Comment 0: score = 5 (5 upvotes) - highest score
  // Comment 1: score = 3 (3 upvotes)
  // Comment 2: score = 1 (1 upvote)
  // Comment 3: score = 0 (no votes) - middle
  // Comment 4: score = -2 (2 downvotes) - negative
  // Comment 5: score = -4 (4 downvotes) - lowest score
  // Comment 0: 5 upvotes
  for (let i = 0; i < 5; i++) {
    await api.functional.communityPlatform.member.comments.vote(voters[i], {
      commentId: comments[0].id,
      body: { voteType: "upvote" },
    });
  }
  // Comment 1: 3 upvotes
  for (let i = 0; i < 3; i++) {
    await api.functional.communityPlatform.member.comments.vote(voters[i], {
      commentId: comments[1].id,
      body: { voteType: "upvote" },
    });
  }
  // Comment 2: 1 upvote
  await api.functional.communityPlatform.member.comments.vote(voters[0], {
    commentId: comments[2].id,
    body: { voteType: "upvote" },
  });
  // Comment 4: 2 downvotes
  for (let i = 0; i < 2; i++) {
    await api.functional.communityPlatform.member.comments.vote(voters[i], {
      commentId: comments[4].id,
      body: { voteType: "downvote" },
    });
  }
  // Comment 5: 4 downvotes
  for (let i = 0; i < 4; i++) {
    await api.functional.communityPlatform.member.comments.vote(voters[i], {
      commentId: comments[5].id,
      body: { voteType: "downvote" },
    });
  }
  // 2. Test 'best' sort: score DESC, created_at ASC
  const bestResult =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: { sort: "best" },
    });
  typia.assert(bestResult);
  const bestComments = bestResult.data;
  TestValidator.predicate(
    "best sort - comments ordered by score DESC",
    bestComments[0].score >= bestComments[1].score,
  );
  TestValidator.predicate(
    "best sort - highest score comment first",
    bestComments[0].id === comments[0].id,
  );
  TestValidator.predicate(
    "best sort - lowest score comment last",
    bestComments[bestComments.length - 1].id === comments[5].id ||
      bestComments[bestComments.length - 1].score <= comments[5].score,
  );
  // 3. Test 'new' sort: created_at DESC
  const newResult = await api.functional.communityPlatform.posts.comments.index(
    connection,
    {
      postId: post.id,
      body: { sort: "new" },
    },
  );
  typia.assert(newResult);
  const newComments = newResult.data;
  TestValidator.predicate(
    "new sort - comments ordered by created_at DESC",
    new Date(newComments[0].createdAt).getTime() >=
      new Date(newComments[1].createdAt).getTime(),
  );
  TestValidator.predicate(
    "new sort - most recent comment first",
    newComments[0].id === comments[comments.length - 1].id,
  );
  TestValidator.predicate(
    "new sort - oldest comment last",
    newComments[newComments.length - 1].id === comments[0].id,
  );
  // 4. Test 'controversial' sort: high engagement, polarizing discussions
  // Add mixed votes to comment 3: 3 upvotes + 2 downvotes = score 1, votes = 5
  // Controversial ratio: ABS(1)/(5+1) = 0.167
  for (let i = 0; i < 3; i++) {
    await api.functional.communityPlatform.member.comments.vote(voters[i], {
      commentId: comments[3].id,
      body: { voteType: "upvote" },
    });
  }
  for (let i = 0; i < 2; i++) {
    await api.functional.communityPlatform.member.comments.vote(voters[i], {
      commentId: comments[3].id,
      body: { voteType: "downvote" },
    });
  }
  const controversialResult =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: { sort: "controversial" },
    });
  typia.assert(controversialResult);
  const controversialComments = controversialResult.data;
  TestValidator.predicate(
    "controversial sort - comments returned",
    controversialComments.length > 0,
  );
  // 5. Test null sort (default behavior) - should be same as 'best'
  const defaultResult =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: { sort: null },
    });
  typia.assert(defaultResult);
  const defaultComments = defaultResult.data;
  TestValidator.equals(
    "default sort - same count as best",
    defaultComments.length,
    bestComments.length,
  );
  TestValidator.predicate(
    "default sort - highest score comment first (same as best)",
    defaultComments[0].score >= defaultComments[1].score,
  );
}
