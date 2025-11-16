import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_redditcommunity_comment_update_by_registered_user(
  connection: api.IConnection,
) {
  // 1. Register the user (join and get authorized user with token)
  const joinedUser1 = await api.functional.auth.registeredUser.join(
    connection,
    {
      body: {
        typeName: "IRedditCommunityRegisteredUser.IJoin",
        email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
        password: RandomGenerator.alphaNumeric(12),
        ip: null,
        href: "https://reddit.com",
        referrer: "https://reddit.com",
      } satisfies IRedditCommunityRegisteredUser.IJoin,
    },
  );
  typia.assert(joinedUser1);

  // 2. Create a community by the registered user
  const community =
    await api.functional.redditCommunity.registeredUser.communities.create(
      connection,
      {
        body: {
          communityName: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 5,
            wordMax: 10,
          }),
          status: "active",
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create a post within the created community
  const post = await api.functional.redditCommunity.registeredUser.posts.create(
    connection,
    {
      body: {
        community_code: community.communityName,
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        type: "text",
        content: RandomGenerator.paragraph({
          sentences: 8,
          wordMin: 4,
          wordMax: 12,
        }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Create a comment on the post by the same user
  const comment =
    await api.functional.redditCommunity.registeredUser.redditCommunityComments.create(
      connection,
      {
        body: {
          post_id: post.id,
          parent_comment_id: null,
          content: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 3,
            wordMax: 9,
          }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);

  // 5. Update the comment's content and optionally the parent_comment_id
  // Select null or the same value to simulate flat comment update
  const updateBody = {
    content: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 5,
      wordMax: 11,
    }),
    parent_comment_id: null,
  } satisfies IRedditCommunityComment.IUpdate;

  const updatedComment =
    await api.functional.redditCommunity.registeredUser.redditCommunityComments.update(
      connection,
      {
        redditCommunityCommentId: comment.id,
        body: updateBody,
      },
    );
  typia.assert(updatedComment);

  // 6. Validate the updated comment
  TestValidator.equals(
    "comment id should not change",
    updatedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "post id should not change",
    updatedComment.post_id,
    comment.post_id,
  );
  TestValidator.equals(
    "author id should not change",
    updatedComment.author_id,
    comment.author_id,
  );
  TestValidator.equals(
    "content should be updated",
    updatedComment.content,
    updateBody.content,
  );
  TestValidator.equals(
    "parent_comment_id should be updated",
    updatedComment.parent_comment_id,
    updateBody.parent_comment_id,
  );

  // 7. Validate that updated_at is after or equal to created_at
  const createdAt = new Date(comment.created_at);
  const updatedAt = new Date(updatedComment.updated_at);
  TestValidator.predicate(
    "updated_at should be same or after created_at",
    updatedAt >= createdAt,
  );
}
