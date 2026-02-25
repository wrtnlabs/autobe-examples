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

export async function test_api_post_votes_pagination_and_changes(
  connection: api.IConnection,
): Promise<void> {
  // Create initial user and post
  const user1Connection: api.IConnection = { host: connection.host };
  const user1 = await authorize_user_join(user1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: "user1_" + RandomGenerator.alphabets(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user1);
  // Create test community and post
  const post = await api.functional.communityPlatform.user.posts.create(
    user1Connection,
    {
      body: {
        title: "Test Post for Vote Pagination",
        community_name: "tests",
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Create additional users for voting
  const voters = await ArrayUtil.asyncRepeat(6, async (index) => {
    const voterConnection: api.IConnection = { host: connection.host };
    const voter = await authorize_user_join(voterConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        username: `voter${index}_` + RandomGenerator.alphabets(8),
      } satisfies ICommunityPlatformUser.IJoin,
    });
    typia.assert(voter);
    return { connection: voterConnection, user: voter };
  });
  // Create votes from different users
  const votes = await ArrayUtil.asyncMap(voters, async (voter, index) => {
    const vote = await api.functional.communityPlatform.user.posts.votes.create(
      voter.connection,
      {
        postId: post.id,
        body: {
          vote_type: index % 2 === 0 ? "upvote" : "downvote",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
    typia.assert(vote);
    return vote;
  });
  // Test default pagination (page 1, default limit)
  const defaultPage =
    await api.functional.communityPlatform.user.posts.votes.index(
      user1Connection,
      {
        postId: post.id,
        body: {
          page: 1,
        } satisfies ICommunityPlatformPostVote.IRequest,
      },
    );
  typia.assert(defaultPage);
  // Validate default pagination metadata
  TestValidator.predicate(
    "default page has pagination info",
    defaultPage.pagination !== undefined,
  );
  TestValidator.equals(
    "default page current is 1",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "default page has valid limit",
    defaultPage.pagination.limit > 0,
  );
  TestValidator.equals(
    "default page total records",
    defaultPage.pagination.records,
    votes.length,
  );
  // Test small limit pagination
  const smallLimitPage =
    await api.functional.communityPlatform.user.posts.votes.index(
      user1Connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies ICommunityPlatformPostVote.IRequest,
      },
    );
  typia.assert(smallLimitPage);
  TestValidator.equals(
    "small limit page has 2 items",
    smallLimitPage.data.length,
    2,
  );
  TestValidator.equals(
    "small limit page current is 1",
    smallLimitPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "small limit page limit is 2",
    smallLimitPage.pagination.limit,
    2,
  );
  // Test higher page with offset
  const page2 = await api.functional.communityPlatform.user.posts.votes.index(
    user1Connection,
    {
      postId: post.id,
      body: {
        page: 2,
        limit: 3,
      } satisfies ICommunityPlatformPostVote.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 current is 2", page2.pagination.current, 2);
  TestValidator.predicate("page 2 has data", page2.data.length > 0);
  // Test maximum limit (100)
  const maxLimitPage =
    await api.functional.communityPlatform.user.posts.votes.index(
      user1Connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformPostVote.IRequest,
      },
    );
  typia.assert(maxLimitPage);
  TestValidator.equals(
    "max limit page limit is 100",
    maxLimitPage.pagination.limit,
    100,
  );
  // Test vote change scenario
  const voteToChange = votes[0];
  const updatedVote =
    await api.functional.communityPlatform.user.posts.votes.update(
      user1Connection,
      {
        postId: post.id,
        voteId: voteToChange.id,
        body: {
          vote_type: "downvote",
        } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  typia.assert(updatedVote);
  TestValidator.equals(
    "vote type changed to downvote",
    updatedVote.vote_type,
    "downvote",
  );
  // Verify vote change is reflected in pagination
  const afterChangePage =
    await api.functional.communityPlatform.user.posts.votes.index(
      user1Connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformPostVote.IRequest,
      },
    );
  typia.assert(afterChangePage);
  const changedVoteInList = afterChangePage.data.find(
    (v) => v.id === voteToChange.id,
  );
  TestValidator.predicate(
    "changed vote exists in list",
    changedVoteInList !== undefined,
  );
  if (changedVoteInList) {
    TestValidator.equals(
      "vote type updated in list",
      changedVoteInList.vote_type,
      "downvote",
    );
  }
  // Test filtering by vote type
  const upvotesOnly =
    await api.functional.communityPlatform.user.posts.votes.index(
      user1Connection,
      {
        postId: post.id,
        body: {
          vote_type: "upvote",
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformPostVote.IRequest,
      },
    );
  typia.assert(upvotesOnly);
  const downvotesOnly =
    await api.functional.communityPlatform.user.posts.votes.index(
      user1Connection,
      {
        postId: post.id,
        body: {
          vote_type: "downvote",
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformPostVote.IRequest,
      },
    );
  typia.assert(downvotesOnly);
  // Validate vote type filtering
  TestValidator.predicate(
    "all upvotes have correct type",
    upvotesOnly.data.every((v) => v.vote_type === "upvote"),
  );
  TestValidator.predicate(
    "all downvotes have correct type",
    downvotesOnly.data.every((v) => v.vote_type === "downvote"),
  );
  // Test that self-voting is prevented (business rule)
  await TestValidator.error("cannot vote on own post", async () => {
    await api.functional.communityPlatform.user.posts.votes.create(
      user1Connection,
      {
        postId: post.id,
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  });
}
