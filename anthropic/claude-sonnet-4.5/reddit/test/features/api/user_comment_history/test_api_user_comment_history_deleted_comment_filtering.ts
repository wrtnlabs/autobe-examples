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
 * Test deleted comment filtering in user comment history based on viewer
 * context.
 *
 * Validates that soft-deleted comments are properly filtered in user comment
 * history depending on the viewer's relationship to the profile owner. When
 * viewing own profile, deleted comments should be visible. When viewing another
 * user's profile, deleted comments should be excluded from results.
 *
 * Test flow:
 *
 * 1. Create comment author member account
 * 2. Create viewer member account (with separate connection)
 * 3. Create community for hosting content
 * 4. Create multiple posts in the community
 * 5. Create multiple comments as the author
 * 6. Delete some comments (soft deletion)
 * 7. Retrieve comment history as author - verify deleted comments included
 * 8. Retrieve author's comment history as viewer - verify deleted comments
 *    excluded
 * 9. Validate comment counts match visible comments
 */
export async function test_api_user_comment_history_deleted_comment_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create comment author member account
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const authorPassword = typia.random<string & tags.MinLength<8>>();
  const authorUsername = RandomGenerator.alphaNumeric(10);

  const author: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: authorUsername,
        email: authorEmail,
        password: authorPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(author);

  // Step 2: Create viewer member account with separate connection
  const viewerConnection: api.IConnection = { ...connection, headers: {} };
  const viewerEmail = typia.random<string & tags.Format<"email">>();
  const viewerPassword = typia.random<string & tags.MinLength<8>>();
  const viewerUsername = RandomGenerator.alphaNumeric(10);

  const viewer: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(viewerConnection, {
      body: {
        username: viewerUsername,
        email: viewerEmail,
        password: viewerPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(viewer);

  // Step 3: Create community (using author account which is currently authenticated)
  const communityCode = RandomGenerator.alphaNumeric(15);
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: communityCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        privacy_type: "public",
        allow_text_posts: true,
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 4: Create multiple posts in the community
  const posts: IRedditLikePost[] = await ArrayUtil.asyncRepeat(3, async () => {
    const post: IRedditLikePost =
      await api.functional.redditLike.member.posts.create(connection, {
        body: {
          community_id: community.id,
          type: "text",
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IRedditLikePost.ICreate,
      });
    typia.assert(post);
    return post;
  });

  // Step 5: Create multiple comments as the author (5 comments total)
  const createdComments: IRedditLikeComment[] = await ArrayUtil.asyncRepeat(
    5,
    async (index) => {
      const postIndex = index % posts.length;
      const comment: IRedditLikeComment =
        await api.functional.redditLike.member.comments.create(connection, {
          body: {
            reddit_like_post_id: posts[postIndex].id,
            content_text: RandomGenerator.paragraph({ sentences: 4 }),
          } satisfies IRedditLikeComment.ICreate,
        });
      typia.assert(comment);
      return comment;
    },
  );

  // Step 6: Delete some comments (delete 2 out of 5)
  const commentsToDelete = createdComments.slice(0, 2);
  await ArrayUtil.asyncForEach(commentsToDelete, async (comment) => {
    await api.functional.redditLike.member.comments.erase(connection, {
      commentId: comment.id,
    });
  });

  // Step 7: Retrieve comment history as author (viewing own profile)
  // Author should see all comments including deleted ones
  const authorOwnHistory: IPageIRedditLikeComment.ISummary =
    await api.functional.redditLike.users.comments(connection, {
      userId: author.id,
      body: {
        page: 1,
        limit: 10,
        sort_by: "new",
      } satisfies IRedditLikeUser.ICommentsRequest,
    });
  typia.assert(authorOwnHistory);

  // Validate author can see all 5 comments (including deleted ones)
  TestValidator.equals(
    "author viewing own profile sees all comments including deleted",
    authorOwnHistory.data.length,
    5,
  );

  // Verify pagination info for author's own view
  TestValidator.equals(
    "author profile total records count",
    authorOwnHistory.pagination.records,
    5,
  );

  // Step 8: Retrieve author's comment history as different viewer
  // Viewer should NOT see deleted comments
  const viewerSeesAuthorHistory: IPageIRedditLikeComment.ISummary =
    await api.functional.redditLike.users.comments(viewerConnection, {
      userId: author.id,
      body: {
        page: 1,
        limit: 10,
        sort_by: "new",
      } satisfies IRedditLikeUser.ICommentsRequest,
    });
  typia.assert(viewerSeesAuthorHistory);

  // Step 9: Validate deleted comments are excluded for viewer
  const expectedVisibleComments =
    createdComments.length - commentsToDelete.length;
  TestValidator.equals(
    "viewer sees only non-deleted comments",
    viewerSeesAuthorHistory.data.length,
    expectedVisibleComments,
  );

  // Verify pagination reflects only visible comments for viewer
  TestValidator.equals(
    "viewer pagination reflects only visible comments",
    viewerSeesAuthorHistory.pagination.records,
    expectedVisibleComments,
  );

  // Verify none of the deleted comment IDs appear in viewer's results
  const deletedCommentIds = commentsToDelete.map((c) => c.id);
  const viewerCommentIds = viewerSeesAuthorHistory.data.map((c) => c.id);

  deletedCommentIds.forEach((deletedId) => {
    TestValidator.predicate(
      "deleted comment not visible to viewer",
      !viewerCommentIds.includes(deletedId),
    );
  });
}
