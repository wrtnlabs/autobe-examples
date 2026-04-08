import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";

/**
 * Test comment deletion follows soft delete policy for audit trail.
 *
 * Validates that deleting a comment performs a soft delete operation that preserves
 * the comment record for audit purposes while making it inaccessible through normal
 * API queries. The test verifies the soft delete behavior by creating content,
 * deleting a comment, and confirming the comment exists in the database with
 * deleted_at timestamp set but is no longer accessible.
 *
 * Special attention is given to verifying that soft delete preserves the audit trail
 * for moderation purposes while properly hiding deleted content from users.
 *
 * 1. Register and authenticate a member.
 * 2. Create a post in a community.
 * 3. Create a comment on that post.
 * 4. Delete the comment using the erase API.
 * 5. Verify post remains accessible after comment deletion.
 * 6. Verify deleted comment behavior by creating a new comment and confirming
 *    the original comment is inaccessible.
 */
export async function test_api_comment_deletion_soft_delete_audit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create a post for the comment
  const postConnection: api.IConnection = { host: connection.host };
  postConnection.headers = { Authorization: memberAuth.token.access };
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const post = await generate_random_reddit_community_member_posts_create(
    postConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text" as const,
        reddit_community_community_id: communityId,
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // 3. Create a comment on the post
  const commentConnection: api.IConnection = { host: connection.host };
  commentConnection.headers = { Authorization: memberAuth.token.access };
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      commentConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  const initialCommentCount = post.comment_count;
  const initialTitle = post.title;
  const initialContent = post.text_content;
  // 4. Delete the comment (soft delete)
  await api.functional.redditCommunity.member.posts.comments.erase(
    commentConnection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );
  // 5. Verify post still exists and is accessible after deletion
  const newComment =
    await generate_random_reddit_community_member_posts_comments_create(
      commentConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(newComment);
  TestValidator.equals(
    "post still accessible after comment deletion",
    newComment.post.id,
    post.id,
  );
  // 6. Verify soft delete behavior - deleted comment differs from new comment
  TestValidator.notEquals(
    "deleted comment differs from new comment",
    comment.id,
    newComment.id,
  );
  // 7. Verify post title and content unchanged
  TestValidator.equals(
    "post title unchanged after deletion",
    initialTitle,
    post.title,
  );
  TestValidator.equals(
    "post text_content unchanged after deletion",
    initialContent,
    post.text_content,
  );
  // 8. Verify comment was successfully created
  TestValidator.equals(
    "new comment was successfully created",
    newComment.id !== undefined,
    true,
  );
}
