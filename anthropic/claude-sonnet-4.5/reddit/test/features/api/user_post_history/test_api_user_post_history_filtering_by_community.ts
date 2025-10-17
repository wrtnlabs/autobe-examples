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
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test retrieving user post history with pagination and sorting validation.
 *
 * This test validates the user post history retrieval functionality across
 * multiple communities. While community filtering is not supported by the API,
 * this test verifies that all posts from a user across different communities
 * are correctly retrieved with proper pagination structure.
 *
 * Workflow:
 *
 * 1. Create member account as the post author
 * 2. Create three different communities for post distribution
 * 3. Create multiple posts across the three communities
 * 4. Retrieve complete post history and validate all posts are returned
 * 5. Verify pagination structure and post counts
 */
export async function test_api_user_post_history_filtering_by_community(
  connection: api.IConnection,
) {
  // Step 1: Create member account as post author
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: memberEmail,
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create three different communities
  const communityTypes = ["technology", "gaming", "music"] as const;
  const communities: IRedditLikeCommunity[] = await ArrayUtil.asyncMap(
    communityTypes,
    async (category) => {
      const community =
        await api.functional.redditLike.member.communities.create(connection, {
          body: {
            code: RandomGenerator.alphaNumeric(10),
            name: RandomGenerator.name(2),
            description: RandomGenerator.paragraph({ sentences: 3 }),
            privacy_type: "public",
            posting_permission: "anyone_subscribed",
            allow_text_posts: true,
            allow_link_posts: true,
            allow_image_posts: true,
            primary_category: category,
          } satisfies IRedditLikeCommunity.ICreate,
        });
      typia.assert(community);
      return community;
    },
  );

  // Step 3: Create multiple posts distributed across the three communities
  const postsPerCommunity = 3;
  const allPosts: IRedditLikePost[] = [];

  for (const community of communities) {
    const communityPosts = await ArrayUtil.asyncRepeat(
      postsPerCommunity,
      async (index) => {
        const postTypes = ["text", "link", "image"] as const;
        const postType = postTypes[index % 3];

        const baseData = {
          community_id: community.id,
          type: postType,
          title: RandomGenerator.paragraph({ sentences: 2 }),
        };

        let postData: IRedditLikePost.ICreate;
        if (postType === "text") {
          postData = {
            ...baseData,
            body: RandomGenerator.content({ paragraphs: 2 }),
          } satisfies IRedditLikePost.ICreate;
        } else if (postType === "link") {
          postData = {
            ...baseData,
            url: `https://example.com/${RandomGenerator.alphaNumeric(10)}`,
          } satisfies IRedditLikePost.ICreate;
        } else {
          postData = {
            ...baseData,
            image_url: `https://images.example.com/${RandomGenerator.alphaNumeric(10)}.jpg`,
            caption: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IRedditLikePost.ICreate;
        }

        const post = await api.functional.redditLike.member.posts.create(
          connection,
          {
            body: postData,
          },
        );
        typia.assert(post);
        return post;
      },
    );

    allPosts.push(...communityPosts);
  }

  // Step 4: Retrieve complete post history and validate
  const completeHistory: IPageIRedditLikePost.ISummary =
    await api.functional.redditLike.users.posts(connection, {
      userId: member.id,
      body: {
        page: 1,
        limit: 20,
      } satisfies IRedditLikeUser.IPostsRequest,
    });
  typia.assert(completeHistory);

  TestValidator.equals(
    "total posts should match created posts count",
    completeHistory.pagination.records,
    allPosts.length,
  );

  TestValidator.predicate(
    "pagination current page should be 1",
    completeHistory.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit should match request",
    completeHistory.pagination.limit === 20,
  );

  TestValidator.predicate(
    "all created posts should be in history",
    completeHistory.data.length === allPosts.length,
  );

  // Step 5: Verify all post IDs are present in the response
  const returnedPostIds = completeHistory.data.map((p) => p.id);
  const createdPostIds = allPosts.map((p) => p.id);

  for (const createdId of createdPostIds) {
    TestValidator.predicate(
      `post ${createdId} should be in returned history`,
      returnedPostIds.includes(createdId),
    );
  }
}
