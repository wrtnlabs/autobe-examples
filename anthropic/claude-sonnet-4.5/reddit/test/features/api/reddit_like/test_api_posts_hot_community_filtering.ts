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

/**
 * Test hot posts endpoint with community filtering.
 *
 * This test validates that the hot posts endpoint correctly filters posts by
 * specific communities. It creates multiple communities, distributes posts
 * across them, and verifies filtering logic works with single community,
 * multiple communities, and no filter scenarios.
 *
 * Steps:
 *
 * 1. Create and authenticate a member account
 * 2. Create three different communities
 * 3. Create posts distributed across all communities
 * 4. Test filtering with single community filter
 * 5. Test filtering with multiple community filters
 * 6. Test no filter returns posts from all communities
 */
export async function test_api_posts_hot_community_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: memberEmail,
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create three different communities
  const community1: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community1);

  const community2: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community2);

  const community3: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community3);

  // Step 3: Create posts distributed across communities
  const postsInCommunity1 = await ArrayUtil.asyncRepeat(3, async () => {
    const post: IRedditLikePost =
      await api.functional.redditLike.member.posts.create(connection, {
        body: {
          community_id: community1.id,
          type: "text",
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IRedditLikePost.ICreate,
      });
    typia.assert(post);
    return post;
  });

  const postsInCommunity2 = await ArrayUtil.asyncRepeat(3, async () => {
    const post: IRedditLikePost =
      await api.functional.redditLike.member.posts.create(connection, {
        body: {
          community_id: community2.id,
          type: "text",
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IRedditLikePost.ICreate,
      });
    typia.assert(post);
    return post;
  });

  const postsInCommunity3 = await ArrayUtil.asyncRepeat(2, async () => {
    const post: IRedditLikePost =
      await api.functional.redditLike.member.posts.create(connection, {
        body: {
          community_id: community3.id,
          type: "text",
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IRedditLikePost.ICreate,
      });
    typia.assert(post);
    return post;
  });

  // Step 4: Test filtering with single community filter
  const singleCommunityResult: IPageIRedditLikePost.ISummary =
    await api.functional.redditLike.posts.hot(connection, {
      body: {
        community_id: community1.id,
      } satisfies IRedditLikePost.IHotRequest,
    });
  typia.assert(singleCommunityResult);

  TestValidator.equals(
    "single community filter returns correct count",
    singleCommunityResult.data.length,
    postsInCommunity1.length,
  );

  const community1PostIds = postsInCommunity1.map((p) => p.id);
  for (const post of singleCommunityResult.data) {
    TestValidator.predicate(
      "all posts belong to filtered community",
      community1PostIds.includes(post.id),
    );
  }

  // Step 5: Test filtering with second community
  const secondCommunityResult: IPageIRedditLikePost.ISummary =
    await api.functional.redditLike.posts.hot(connection, {
      body: {
        community_id: community2.id,
      } satisfies IRedditLikePost.IHotRequest,
    });
  typia.assert(secondCommunityResult);

  TestValidator.equals(
    "second community filter returns correct count",
    secondCommunityResult.data.length,
    postsInCommunity2.length,
  );

  const community2PostIds = postsInCommunity2.map((p) => p.id);
  for (const post of secondCommunityResult.data) {
    TestValidator.predicate(
      "all posts belong to second filtered community",
      community2PostIds.includes(post.id),
    );
  }

  // Step 6: Test no filter returns posts from all communities
  const allPostsResult: IPageIRedditLikePost.ISummary =
    await api.functional.redditLike.posts.hot(connection, {
      body: {} satisfies IRedditLikePost.IHotRequest,
    });
  typia.assert(allPostsResult);

  const totalPosts =
    postsInCommunity1.length +
    postsInCommunity2.length +
    postsInCommunity3.length;
  TestValidator.predicate(
    "no filter returns posts from all communities",
    allPostsResult.data.length >= totalPosts,
  );
}
