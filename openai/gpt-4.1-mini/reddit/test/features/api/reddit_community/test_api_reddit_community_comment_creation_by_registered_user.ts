import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

/**
 * Test creation of a reddit community comment by a registered user.
 *
 * This test validates the complete flow of a registered user joining the
 * platform, creating a community, posting a post, and then commenting on the
 * post with nested comments.
 *
 * It ensures that authentication, data linkage between user, community, and
 * post, and nested comment creation are functioning correctly with all
 * associated constraints such as content length and parent comment linking.
 *
 * Steps:
 *
 * 1. Register a new user.
 * 2. Create a new community under the user account.
 * 3. Create a post in the newly created community.
 * 4. Add a top-level comment to the post.
 * 5. Add a nested reply comment under the previous comment.
 *
 * Validations:
 *
 * - All API responses must confirm correct types.
 * - Comment content must not exceed 1000 characters.
 * - Replies must correctly reference the parent comment id.
 */
export async function test_api_reddit_community_comment_creation_by_registered_user(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    typeName: "IRedditCommunityRegisteredUser.IJoin",
    email: userEmail,
    password: "TestPassword123!",
    href: "https://reddit.example.com/signup",
    referrer: "https://reddit.example.com/",
    ip: null,
  } satisfies IRedditCommunityRegisteredUser.IJoin;

  const user: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  typia.assert(user);

  // 2. Create a new community
  const communityName = RandomGenerator.alphabets(8).toLowerCase();
  const createCommunityBody = {
    communityName: communityName,
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
    status: "active",
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.communities.create(
      connection,
      {
        body: createCommunityBody,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community name matches",
    community.communityName,
    communityName,
  );

  // 3. Create a post in the community
  const postTitle = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 4,
    wordMax: 7,
  });
  const postContent = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 3,
    sentenceMax: 5,
    wordMin: 4,
    wordMax: 8,
  });

  const createPostBody = {
    community_code: community.communityName,
    title: postTitle,
    type: "text",
    content: postContent,
  } satisfies IRedditCommunityPost.ICreate;

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.posts.create(
      connection,
      {
        body: createPostBody,
      },
    );
  typia.assert(post);
  TestValidator.equals(
    "post community code matches",
    post.community_code,
    community.communityName,
  );
  TestValidator.equals("post title matches", post.title, postTitle);

  // 4. Add a top-level comment (parent_comment_id omitted) with content length validation
  let commentContent = RandomGenerator.paragraph({
    sentences: 20,
    wordMin: 2,
    wordMax: 6,
  });
  if (commentContent.length > 1000) {
    // Truncate to max length 1000
    commentContent = commentContent.substring(0, 1000);
  }

  const createCommentBody = {
    post_id: post.id,
    content: commentContent,
    parent_comment_id: null,
  } satisfies IRedditCommunityComment.ICreate;

  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.registeredUser.redditCommunityComments.create(
      connection,
      {
        body: createCommentBody,
      },
    );
  typia.assert(comment);
  TestValidator.equals(
    "comment content matches",
    comment.content,
    createCommentBody.content,
  );
  TestValidator.equals("comment post id matches", comment.post_id, post.id);
  TestValidator.equals(
    "comment parent comment id is null",
    comment.parent_comment_id,
    null,
  );

  // 5. Add a nested reply comment with parent_comment_id referencing the first comment
  let replyContent = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 2,
    wordMax: 6,
  });
  if (replyContent.length > 1000) {
    // Truncate to max length 1000
    replyContent = replyContent.substring(0, 1000);
  }

  const createReplyBody = {
    post_id: post.id,
    content: replyContent,
    parent_comment_id: comment.id,
  } satisfies IRedditCommunityComment.ICreate;

  const replyComment: IRedditCommunityComment =
    await api.functional.redditCommunity.registeredUser.redditCommunityComments.create(
      connection,
      {
        body: createReplyBody,
      },
    );
  typia.assert(replyComment);
  TestValidator.equals(
    "reply content matches",
    replyComment.content,
    createReplyBody.content,
  );
  TestValidator.equals(
    "reply parent comment id matches",
    replyComment.parent_comment_id,
    comment.id,
  );
  TestValidator.equals("reply post id matches", replyComment.post_id, post.id);
}
