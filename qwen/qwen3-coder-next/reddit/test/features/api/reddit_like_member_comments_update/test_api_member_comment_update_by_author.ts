import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";

export async function test_api_member_comment_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: null,
    avatar_url: null,
  } satisfies IRedditLikeMember.IJoin;
  const member = await authorize_member_join(memberConnection, {
    body: memberCredentials,
  });
  typia.assert(member);
  // 2. Create a new post first (we need a postId to create a comment)
  // Since we don't have post creation endpoint available, we'll use a generated postId
  // In a real scenario, this would be created via a post creation endpoint
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create a comment on the post
  const commentBody = {
    content: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditLikeComment.ICreate;
  const createdComment =
    await api.functional.redditLike.member.posts.comments.create(
      memberConnection,
      {
        postId: postId,
        body: commentBody,
      },
    );
  typia.assert(createdComment);
  const originalCreatedAt = createdComment.created_at;
  const originalUpdatedAt = createdComment.updated_at;
  // 4. Immediately update the comment content
  const newContent = RandomGenerator.paragraph({ sentences: 2 });
  const updateBody = {
    content: newContent,
  } satisfies IRedditLikeComment.IUpdate;
  const updatedComment = await api.functional.redditLike.member.comments.update(
    memberConnection,
    {
      commentId: createdComment.id,
      body: updateBody,
    },
  );
  typia.assert(updatedComment);
  // 5. Verify the response contains updated content and timestamps
  TestValidator.equals("content updated", updatedComment.content, newContent);
  TestValidator.equals(
    "author_id unchanged",
    updatedComment.author_id,
    createdComment.author_id,
  );
  TestValidator.equals(
    "post_id unchanged",
    updatedComment.post_id,
    createdComment.post_id,
  );
  TestValidator.equals(
    "parent_comment_id unchanged",
    updatedComment.parent_comment_id,
    createdComment.parent_comment_id,
  );
  TestValidator.equals(
    "vote_score unchanged",
    updatedComment.vote_score,
    createdComment.vote_score,
  );
  // 6. Verify updated_at timestamp is newer than created_at
  TestValidator.predicate(
    "updated_at is newer",
    () =>
      new Date(updatedComment.updated_at).getTime() >
      new Date(originalUpdatedAt).getTime(),
  );
  // 7. Verify author relationship is populated correctly
  TestValidator.equals(
    "author_id matches",
    updatedComment.author.id,
    createdComment.author.id,
  );
  TestValidator.equals(
    "post_id matches",
    updatedComment.post.id,
    createdComment.post.id,
  );
}
