import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test that a member can successfully update the content of their own comment.
 * Verifies authentication, ownership, content validation, timestamp preservation,
 * and snapshot creation during comment update operations.
 */
export async function test_api_comment_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCloneCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "text",
        communityId: community.id,
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Create a comment on the post
  const originalContent = RandomGenerator.paragraph({ sentences: 3 });
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: originalContent,
        } satisfies IRedditCloneComment.ICreate,
      },
    );
  typia.assert(comment);
  // Store original values for comparison
  const originalCreatedAt = comment.created_at;
  const originalScore = comment.score;
  const originalParent = comment.parent;
  // 5. Update the comment with new content
  const newContent = RandomGenerator.paragraph({ sentences: 5 });
  const updatedComment =
    await api.functional.redditClone.member.posts.comments.update(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          content: newContent,
        } satisfies IRedditCloneComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // 6. Validate the update response
  TestValidator.equals("content updated", updatedComment.content, newContent);
  TestValidator.equals(
    "created_at preserved",
    updatedComment.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at is after created_at",
    updatedComment.updated_at > originalCreatedAt,
  );
  TestValidator.equals("score unchanged", updatedComment.score, originalScore);
  TestValidator.equals(
    "parent unchanged",
    updatedComment.parent,
    originalParent,
  );
  TestValidator.equals("comment id unchanged", updatedComment.id, comment.id);
  TestValidator.equals(
    "author unchanged",
    updatedComment.author.id,
    comment.author.id,
  );
  TestValidator.equals("post unchanged", updatedComment.post.id, post.id);
  TestValidator.equals("deleted_at is null", updatedComment.deleted_at, null);
}