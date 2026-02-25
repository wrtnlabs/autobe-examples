import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { generate_random_community_platform_user_posts_votes_create } from "../../../generate/generate_random_community_platform_user_posts_votes_create";
import { generate_random_community_platform_user_subscriptions_create } from "../../../generate/generate_random_community_platform_user_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_post_votes_authorization_and_states(
  connection: api.IConnection,
): Promise<void> {
  // Create first user and authenticate
  const user1Connection: api.IConnection = { host: connection.host };
  const user1 = await authorize_user_join(user1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user1);
  // Create second user and authenticate
  const user2Connection: api.IConnection = { host: connection.host };
  const user2 = await authorize_user_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user2);
  // Create community with user1
  const community =
    await generate_random_community_platform_user_communities_create(
      user1Connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Subscribe both users to the community
  await generate_random_community_platform_user_subscriptions_create(
    user1Connection,
    {
      body: {
        community_platform_community_id: community.id,
      } satisfies ICommunityPlatformCommunitySubscription.ICreate,
    },
  );
  await generate_random_community_platform_user_subscriptions_create(
    user2Connection,
    {
      body: {
        community_platform_community_id: community.id,
      } satisfies ICommunityPlatformCommunitySubscription.ICreate,
    },
  );
  // Create post with user1
  const post = await generate_random_community_platform_user_posts_create(
    user1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Cast votes from both users
  const user1Vote =
    await generate_random_community_platform_user_posts_votes_create(
      user1Connection,
      {
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformPostVote.ICreate,
        params: { postId: post.id },
      },
    );
  typia.assert(user1Vote);
  const user2Vote =
    await generate_random_community_platform_user_posts_votes_create(
      user2Connection,
      {
        body: {
          vote_type: "downvote",
        } satisfies ICommunityPlatformPostVote.ICreate,
        params: { postId: post.id },
      },
    );
  typia.assert(user2Vote);
  // Test vote retrieval with filtering
  const allVotes =
    await api.functional.communityPlatform.user.posts.votes.index(
      user1Connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostVote.IRequest,
      },
    );
  typia.assert(allVotes);
  TestValidator.equals("should have 2 votes", allVotes.data.length, 2);
  // Test filtering by vote type
  const upvotes = await api.functional.communityPlatform.user.posts.votes.index(
    user1Connection,
    {
      postId: post.id,
      body: {
        vote_type: "upvote",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformPostVote.IRequest,
    },
  );
  typia.assert(upvotes);
  TestValidator.equals("should have 1 upvote", upvotes.data.length, 1);
  TestValidator.equals("upvote type", upvotes.data[0].vote_type, "upvote");
  const downvotes =
    await api.functional.communityPlatform.user.posts.votes.index(
      user1Connection,
      {
        postId: post.id,
        body: {
          vote_type: "downvote",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostVote.IRequest,
      },
    );
  typia.assert(downvotes);
  TestValidator.equals("should have 1 downvote", downvotes.data.length, 1);
  TestValidator.equals(
    "downvote type",
    downvotes.data[0].vote_type,
    "downvote",
  );
  // Test non-existent vote type filtering
  const invalidVoteType =
    await api.functional.communityPlatform.user.posts.votes.index(
      user1Connection,
      {
        postId: post.id,
        body: {
          vote_type: "invalid_vote_type",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostVote.IRequest,
      },
    );
  typia.assert(invalidVoteType);
  TestValidator.equals(
    "non-existent vote type should return empty",
    invalidVoteType.data.length,
    0,
  );
  // Test pagination
  const paginatedVotes =
    await api.functional.communityPlatform.user.posts.votes.index(
      user1Connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformPostVote.IRequest,
      },
    );
  typia.assert(paginatedVotes);
  TestValidator.equals(
    "should have 1 vote per page",
    paginatedVotes.data.length,
    1,
  );
  TestValidator.equals("total records", paginatedVotes.pagination.records, 2);
  TestValidator.equals("total pages", paginatedVotes.pagination.pages, 2);
  TestValidator.equals("current page", paginatedVotes.pagination.current, 1);
  TestValidator.equals("limit", paginatedVotes.pagination.limit, 1);
  // Test authorization - user who is not subscribed should get error
  const nonSubscribedUserConnection: api.IConnection = {
    host: connection.host,
  };
  const nonSubscribedUser = await authorize_user_join(
    nonSubscribedUserConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        username: RandomGenerator.alphaNumeric(12),
      } satisfies ICommunityPlatformUser.IJoin,
    },
  );
  typia.assert(nonSubscribedUser);
  await TestValidator.error(
    "non-subscribed user cannot access votes",
    async () => {
      await api.functional.communityPlatform.user.posts.votes.index(
        nonSubscribedUserConnection,
        {
          postId: post.id,
          body: {
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformPostVote.IRequest,
        },
      );
    },
  );
  // Test invalid postId format
  await TestValidator.error("invalid postId format should fail", async () => {
    await api.functional.communityPlatform.user.posts.votes.index(
      user1Connection,
      {
        postId: "invalid-uuid-format",
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostVote.IRequest,
      },
    );
  });
  // Test non-existent post
  await TestValidator.error(
    "non-existent post should return error",
    async () => {
      await api.functional.communityPlatform.user.posts.votes.index(
        user1Connection,
        {
          postId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformPostVote.IRequest,
        },
      );
    },
  );
  // Test empty votes list returns empty data array
  const emptyVotesPost =
    await generate_random_community_platform_user_posts_create(
      user1Connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          community_name: community.name,
          post_type: "text",
          text_content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(emptyVotesPost);
  const emptyVotes =
    await api.functional.communityPlatform.user.posts.votes.index(
      user1Connection,
      {
        postId: emptyVotesPost.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostVote.IRequest,
      },
    );
  typia.assert(emptyVotes);
  TestValidator.equals(
    "empty votes should return empty array",
    emptyVotes.data.length,
    0,
  );
  TestValidator.equals(
    "empty votes pagination records",
    emptyVotes.pagination.records,
    0,
  );
}
