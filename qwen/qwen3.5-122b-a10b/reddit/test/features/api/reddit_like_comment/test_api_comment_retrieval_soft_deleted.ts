import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

/**
 * Test soft-deleted comment retrieval returns 404 Not Found.
 *
 * Validates that comments which have been soft-deleted are properly hidden from all users, including the comment author. The test creates a complete workflow from member registration through comment deletion, then verifies the retrieval endpoint correctly returns a 404 error for the deleted comment.
 *
 * This test ensures the soft-deletion mechanism works correctly by:
 * 1. Registering and authenticating a member account
 * 2. Creating a post in a community
 * 3. Creating a comment on that post
 * 4. Soft-deleting the comment via the DELETE endpoint
 * 5. Attempting to retrieve the deleted comment
 * 6. Validating the 404 Not Found response
 *
 * 1. Member account creation and authentication
 * 1.1. Register new member with random credentials
 * 1.2. Authenticate and establish member connection
 * 2. Post creation in community
 * 2.1. Create text post with title and content
 * 3. Comment creation on post
 * 3.1. Create comment with random content
 * 3.2. Verify comment was created successfully
 * 4. Comment soft-deletion
 * 4.1. Delete comment using member connection
 * 4.2. Verify deletion completed without error
 * 5. Comment retrieval attempt
 * 5.1. Attempt to retrieve deleted comment using GET endpoint
 * 5.2. Validate 404 Not Found error is returned
 */
export async function test_api_comment_retrieval_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a post in a community
  // Note: In production, this would require a valid community_id from an existing community
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_type: "text",
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create a comment on the post
  const comment =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeComment.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 4. Soft-delete the comment
  await api.functional.redditLike.member.posts.comments.erase(
    memberConnection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );
  // 5. Attempt to retrieve the deleted comment - should return 404
  await TestValidator.httpError(
    "deleted comment should return 404",
    404,
    async () => {
      await api.functional.redditLike.member.posts.comments.at(
        memberConnection,
        {
          postId: post.id,
          commentId: comment.id,
        },
      );
    },
  );
}
