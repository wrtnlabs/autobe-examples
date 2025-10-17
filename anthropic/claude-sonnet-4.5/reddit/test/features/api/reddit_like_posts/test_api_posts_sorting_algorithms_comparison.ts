import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";

export async function test_api_posts_sorting_algorithms_comparison(
  connection: api.IConnection,
) {
  // Step 1: Create two member accounts for voting
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Password = RandomGenerator.alphaNumeric(10);
  const member1: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: member1Email,
        password: member1Password,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member1);

  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Password = RandomGenerator.alphaNumeric(10);
  const member2: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: member2Email,
        password: member2Password,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member2);

  // Step 2: Switch back to member1 and create a community
  connection.headers = {};
  connection.headers.Authorization = member1.token.access;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(15),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Create posts with different characteristics for sorting validation
  const post1: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: "Old post with low score",
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post1);

  const post2: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: "Recent post with high score",
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post2);

  const post3: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: "Controversial post with balanced votes",
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post3);

  const post4: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: "Newest post",
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post4);

  // Step 4: Switch to member2 to vote on member1's posts
  connection.headers.Authorization = member2.token.access;

  // Post 1: Low score (1 upvote from member2)
  await api.functional.redditLike.member.posts.votes.create(connection, {
    postId: post1.id,
    body: { vote_value: 1 } satisfies IRedditLikePostVote.ICreate,
  });

  // Post 2: High score (2 upvotes - from member2 first)
  await api.functional.redditLike.member.posts.votes.create(connection, {
    postId: post2.id,
    body: { vote_value: 1 } satisfies IRedditLikePostVote.ICreate,
  });

  // Switch to member1 for additional vote on post2
  connection.headers.Authorization = member1.token.access;

  await api.functional.redditLike.member.posts.votes.create(connection, {
    postId: post2.id,
    body: { vote_value: 1 } satisfies IRedditLikePostVote.ICreate,
  });

  // Post 3: Controversial pattern - member1 upvotes
  await api.functional.redditLike.member.posts.votes.create(connection, {
    postId: post3.id,
    body: { vote_value: 1 } satisfies IRedditLikePostVote.ICreate,
  });

  // Switch to member2 for downvote on post3
  connection.headers.Authorization = member2.token.access;

  await api.functional.redditLike.member.posts.votes.create(connection, {
    postId: post3.id,
    body: { vote_value: -1 } satisfies IRedditLikePostVote.ICreate,
  });

  // Step 5: Test "new" sorting - should show strict chronological order (newest first)
  const newSorted: IPageIRedditLikePost.ISummary =
    await api.functional.redditLike.posts.index(connection, {
      body: {
        community_id: community.id,
        sort_by: "new",
      } satisfies IRedditLikePost.IRequest,
    });
  typia.assert(newSorted);

  TestValidator.predicate(
    "new sorting returns posts",
    newSorted.data.length >= 4,
  );

  // Verify newest post appears first in new sorting
  TestValidator.equals(
    "new sorting shows newest post first",
    newSorted.data[0].id,
    post4.id,
  );

  // Step 6: Test "top" sorting - should show highest scores first
  const topSorted: IPageIRedditLikePost.ISummary =
    await api.functional.redditLike.posts.index(connection, {
      body: {
        community_id: community.id,
        sort_by: "top",
      } satisfies IRedditLikePost.IRequest,
    });
  typia.assert(topSorted);

  TestValidator.predicate(
    "top sorting returns posts",
    topSorted.data.length >= 4,
  );

  // Verify highest-scored post (post2 with 2 upvotes) appears first
  TestValidator.equals(
    "top sorting shows highest scored post first",
    topSorted.data[0].id,
    post2.id,
  );

  // Step 7: Test "hot" sorting - should show trending content
  const hotSorted: IPageIRedditLikePost.ISummary =
    await api.functional.redditLike.posts.index(connection, {
      body: {
        community_id: community.id,
        sort_by: "hot",
      } satisfies IRedditLikePost.IRequest,
    });
  typia.assert(hotSorted);

  TestValidator.predicate(
    "hot sorting returns posts",
    hotSorted.data.length >= 4,
  );

  // Step 8: Test "controversial" sorting - should show polarizing content
  const controversialSorted: IPageIRedditLikePost.ISummary =
    await api.functional.redditLike.posts.index(connection, {
      body: {
        community_id: community.id,
        sort_by: "controversial",
      } satisfies IRedditLikePost.IRequest,
    });
  typia.assert(controversialSorted);

  TestValidator.predicate(
    "controversial sorting returns posts",
    controversialSorted.data.length >= 4,
  );

  // Step 9: Validate that different sorting algorithms produce different orderings
  TestValidator.notEquals(
    "new and top sorting produce different orderings",
    newSorted.data.map((p) => p.id),
    topSorted.data.map((p) => p.id),
  );

  TestValidator.notEquals(
    "hot and new sorting produce different orderings",
    hotSorted.data.map((p) => p.id),
    newSorted.data.map((p) => p.id),
  );

  TestValidator.notEquals(
    "controversial and top sorting produce different orderings",
    controversialSorted.data.map((p) => p.id),
    topSorted.data.map((p) => p.id),
  );
}
