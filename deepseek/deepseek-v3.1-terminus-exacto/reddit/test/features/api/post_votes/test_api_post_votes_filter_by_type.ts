import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { generate_random_community_platform_user_posts_votes_create } from "../../../generate/generate_random_community_platform_user_posts_votes_create";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_post_votes_filter_by_type(
  connection: api.IConnection,
): Promise<void> {
  // Create main user who will create the post
  const mainUserConnection: api.IConnection = { host: connection.host };
  const mainUser = await authorize_user_join(mainUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(mainUser);
  // Create a post for testing votes
  const post = await generate_random_community_platform_user_posts_create(
    mainUserConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: "general", // Using a likely existing community name
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Create second user who will cast upvote
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUser = await authorize_user_join(secondUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(secondUser);
  // Create third user who will cast downvote
  const thirdUserConnection: api.IConnection = { host: connection.host };
  const thirdUser = await authorize_user_join(thirdUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(thirdUser);
  // Second user casts upvote
  const upvote =
    await generate_random_community_platform_user_posts_votes_create(
      secondUserConnection,
      {
        params: { postId: post.id },
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(upvote);
  // Third user casts downvote
  const downvote =
    await generate_random_community_platform_user_posts_votes_create(
      thirdUserConnection,
      {
        params: { postId: post.id },
        body: {
          vote_type: "downvote",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(downvote);
  // Test retrieving all votes with pagination using second user's connection
  const allVotes =
    await api.functional.communityPlatform.user.posts.votes.index(
      secondUserConnection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostVote.IRequest,
      },
    );
  typia.assert(allVotes);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    allVotes.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", allVotes.pagination.limit, 10);
  TestValidator.equals("total vote records", allVotes.pagination.records, 2);
  TestValidator.equals("total pages", allVotes.pagination.pages, 1);
  // Validate vote count
  TestValidator.equals("vote count", allVotes.data.length, 2);
  // Validate votes are sorted by created_at descending (newest first)
  TestValidator.predicate(
    "votes sorted by created_at descending",
    allVotes.data[0].created_at >= allVotes.data[1].created_at,
  );
  // Test filtering by upvote type
  const upvotesOnly =
    await api.functional.communityPlatform.user.posts.votes.index(
      secondUserConnection,
      {
        postId: post.id,
        body: {
          vote_type: "upvote",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostVote.IRequest,
      },
    );
  typia.assert(upvotesOnly);
  // Validate only upvotes are returned
  TestValidator.equals("upvote count", upvotesOnly.data.length, 1);
  TestValidator.equals(
    "vote type is upvote",
    upvotesOnly.data[0].vote_type,
    "upvote",
  );
  TestValidator.equals(
    "upvote user matches",
    upvotesOnly.data[0].user.id,
    secondUser.id,
  );
  // Test filtering by downvote type
  const downvotesOnly =
    await api.functional.communityPlatform.user.posts.votes.index(
      thirdUserConnection,
      {
        postId: post.id,
        body: {
          vote_type: "downvote",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostVote.IRequest,
      },
    );
  typia.assert(downvotesOnly);
  // Validate only downvotes are returned
  TestValidator.equals("downvote count", downvotesOnly.data.length, 1);
  TestValidator.equals(
    "vote type is downvote",
    downvotesOnly.data[0].vote_type,
    "downvote",
  );
  TestValidator.equals(
    "downvote user matches",
    downvotesOnly.data[0].user.id,
    thirdUser.id,
  );
  // Test pagination with different parameters
  const paginatedVotes =
    await api.functional.communityPlatform.user.posts.votes.index(
      secondUserConnection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformPostVote.IRequest,
      },
    );
  typia.assert(paginatedVotes);
  // Validate pagination with limit 1
  TestValidator.equals(
    "pagination with limit 1",
    paginatedVotes.data.length,
    1,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedVotes.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", paginatedVotes.pagination.limit, 1);
  TestValidator.equals(
    "total vote records",
    paginatedVotes.pagination.records,
    2,
  );
  TestValidator.equals("total pages", paginatedVotes.pagination.pages, 2);
  // Test authentication requirement by trying to access without authentication
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("authentication required", async () => {
    await api.functional.communityPlatform.user.posts.votes.index(
      unauthenticatedConnection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostVote.IRequest,
      },
    );
  });
}
