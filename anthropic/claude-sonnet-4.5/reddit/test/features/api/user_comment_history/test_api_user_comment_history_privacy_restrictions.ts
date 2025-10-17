import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeComment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test user comment history retrieval functionality.
 *
 * This test validates that the comment history endpoint correctly retrieves a
 * user's comments with proper pagination and filtering. Since the API does not
 * provide privacy setting configuration through the profile update endpoint,
 * this test focuses on the core comment history retrieval functionality.
 *
 * Steps:
 *
 * 1. Create a member account (comment author)
 * 2. Create a community for hosting content
 * 3. Create posts within the community
 * 4. Author creates multiple comments on posts
 * 5. Retrieve comment history and validate results
 * 6. Test pagination and sorting parameters
 */
export async function test_api_user_comment_history_privacy_restrictions(
  connection: api.IConnection,
) {
  // Step 1: Create comment author account
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const author = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: authorEmail,
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(author);

  // Step 2: Create a community
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(15),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Create posts for commenting
  const posts = await ArrayUtil.asyncRepeat(3, async () => {
    const post = await api.functional.redditLike.member.posts.create(
      connection,
      {
        body: {
          community_id: community.id,
          type: "text",
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IRedditLikePost.ICreate,
      },
    );
    typia.assert(post);
    return post;
  });

  // Step 4: Create multiple comments
  const comments = await ArrayUtil.asyncRepeat(5, async (index) => {
    const comment = await api.functional.redditLike.member.comments.create(
      connection,
      {
        body: {
          reddit_like_post_id: posts[index % posts.length].id,
          content_text: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeComment.ICreate,
      },
    );
    typia.assert(comment);
    return comment;
  });

  // Step 5: Retrieve comment history
  const commentHistory = await api.functional.redditLike.users.comments(
    connection,
    {
      userId: author.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IRedditLikeUser.ICommentsRequest,
    },
  );
  typia.assert(commentHistory);

  // Validate retrieved comments
  TestValidator.predicate(
    "comment history should contain created comments",
    commentHistory.data.length === comments.length,
  );

  TestValidator.predicate(
    "pagination should show correct current page",
    commentHistory.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination should show correct limit",
    commentHistory.pagination.limit === 10,
  );

  // Step 6: Test with different sorting
  const sortedByNew = await api.functional.redditLike.users.comments(
    connection,
    {
      userId: author.id,
      body: {
        page: 1,
        limit: 10,
        sort_by: "new",
      } satisfies IRedditLikeUser.ICommentsRequest,
    },
  );
  typia.assert(sortedByNew);

  TestValidator.predicate(
    "sorted by new should return comments",
    sortedByNew.data.length > 0,
  );

  // Test pagination with smaller limit
  const paginatedComments = await api.functional.redditLike.users.comments(
    connection,
    {
      userId: author.id,
      body: {
        page: 1,
        limit: 3,
      } satisfies IRedditLikeUser.ICommentsRequest,
    },
  );
  typia.assert(paginatedComments);

  TestValidator.predicate(
    "pagination with limit 3 should return at most 3 comments",
    paginatedComments.data.length <= 3,
  );
}
