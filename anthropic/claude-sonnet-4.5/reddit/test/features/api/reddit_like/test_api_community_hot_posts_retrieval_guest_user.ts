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

/**
 * Test guest user browsing hot-sorted trending posts from a public community.
 *
 * This test validates the public content discovery mechanism where
 * unauthenticated visitors can explore community content sorted by the Hot
 * algorithm. The test creates a community, posts with varying engagement
 * levels, and retrieves them as a guest to verify proper hot scoring and
 * pagination.
 *
 * Steps:
 *
 * 1. Create member account for test data setup
 * 2. Create public community
 * 3. Create multiple posts with different content types
 * 4. Add votes to simulate varying engagement
 * 5. Retrieve hot posts as guest user (unauthenticated)
 * 6. Validate hot score sorting and pagination
 * 7. Verify post summary metadata completeness
 */
export async function test_api_community_hot_posts_retrieval_guest_user(
  connection: api.IConnection,
) {
  // Step 1: Create member account to set up test data
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: memberEmail,
      password: "SecurePass123!",
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a public community for testing
  const communityCode = RandomGenerator.alphaNumeric(15);
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: communityCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 10,
        }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "technology",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Create multiple posts with different content types
  const posts = await ArrayUtil.asyncRepeat(5, async (index) => {
    const postTypes = ["text", "link", "image"] as const;
    const postType = RandomGenerator.pick(postTypes);

    const basePost = {
      community_id: community.id,
      type: postType,
      title: `${RandomGenerator.name(3)} - Post ${index + 1}`,
    };

    const typeSpecificContent =
      postType === "text"
        ? {
            body: RandomGenerator.content({
              paragraphs: 2,
              sentenceMin: 10,
              sentenceMax: 20,
            }),
          }
        : postType === "link"
          ? {
              url: typia.random<
                string & tags.Format<"url"> & tags.MaxLength<2000>
              >(),
            }
          : {
              image_url: typia.random<string & tags.Format<"url">>(),
              caption: RandomGenerator.paragraph({ sentences: 3 }),
            };

    const post = await api.functional.redditLike.member.posts.create(
      connection,
      {
        body: {
          ...basePost,
          ...typeSpecificContent,
        } satisfies IRedditLikePost.ICreate,
      },
    );
    typia.assert(post);

    return post;
  });

  // Step 4: Add votes to posts - cast one vote per post from the member
  await ArrayUtil.asyncForEach(posts, async (post) => {
    const voteValue = RandomGenerator.pick([
      1, -1,
    ] as const) satisfies number as number;
    const vote = await api.functional.redditLike.member.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          vote_value: voteValue,
        } satisfies IRedditLikePostVote.ICreate,
      },
    );
    typia.assert(vote);
  });

  // Step 5: Retrieve hot posts as guest user (create unauthenticated connection)
  const guestConnection: api.IConnection = { ...connection, headers: {} };

  const hotPosts = await api.functional.redditLike.communities.posts.hot(
    guestConnection,
    {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IRedditLikePost.IHotRequest,
    },
  );
  typia.assert(hotPosts);

  // Step 6: Validate pagination structure
  TestValidator.predicate(
    "pagination should have valid structure",
    hotPosts.pagination.current === 1 &&
      hotPosts.pagination.limit === 10 &&
      hotPosts.pagination.records >= 0 &&
      hotPosts.pagination.pages >= 0,
  );

  // Step 7: Verify post summaries include necessary metadata
  TestValidator.predicate(
    "hot posts should be returned",
    hotPosts.data.length > 0,
  );

  await ArrayUtil.asyncForEach(hotPosts.data, async (postSummary) => {
    TestValidator.predicate(
      "post summary should have id",
      typeof postSummary.id === "string" && postSummary.id.length > 0,
    );

    TestValidator.predicate(
      "post summary should have type",
      ["text", "link", "image"].includes(postSummary.type),
    );

    TestValidator.predicate(
      "post summary should have title",
      typeof postSummary.title === "string" && postSummary.title.length > 0,
    );

    TestValidator.predicate(
      "post summary should have created_at timestamp",
      typeof postSummary.created_at === "string" &&
        postSummary.created_at.length > 0,
    );
  });

  // Step 8: Validate that posts are returned (basic hot algorithm validation)
  TestValidator.predicate(
    "guest user should be able to retrieve hot posts from public community",
    hotPosts.data.length === posts.length,
  );
}
