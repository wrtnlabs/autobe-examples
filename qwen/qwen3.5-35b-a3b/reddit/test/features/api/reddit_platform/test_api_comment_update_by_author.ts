import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_comments_create } from "../../../generate/generate_random_reddit_platform_member_comments_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";

export async function test_api_comment_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create a post
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: typia.random<IRedditPlatformPost.ICreate>(),
    },
  );
  typia.assert(post);
  // 3. Create a comment on the post
  const comment = await api.functional.redditPlatform.member.comments.create(
    memberConnection,
    {
      body: {
        reddit_platform_post_id: post.id,
        content: "Initial comment content for testing",
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(comment);
  const originalCreatedAt = comment.created_at;
  const originalContent = comment.content;
  const originalScore = comment.score;
  const originalUpvotes = comment.upvotes_count;
  const originalDownvotes = comment.downvotes_count;
  const originalCommentCount = comment.comment_count;
  const originalAuthorId = comment.author.id;
  // 4. Update the comment
  const newContent = "Updated comment content for testing";
  const updatedComment =
    await api.functional.redditPlatform.member.comments.update(
      memberConnection,
      {
        commentId: comment.id,
        body: {
          content: newContent,
        } satisfies IRedditPlatformComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // 5. Validate the update
  TestValidator.equals("content updated", updatedComment.content, newContent);
  TestValidator.notEquals(
    "updated_at changed",
    originalCreatedAt,
    updatedComment.updated_at,
  );
  TestValidator.equals("score unchanged", updatedComment.score, originalScore);
  TestValidator.equals(
    "upvotes unchanged",
    updatedComment.upvotes_count,
    originalUpvotes,
  );
  TestValidator.equals(
    "downvotes unchanged",
    updatedComment.downvotes_count,
    originalDownvotes,
  );
  TestValidator.equals(
    "comment_count unchanged",
    updatedComment.comment_count,
    originalCommentCount,
  );
  TestValidator.equals(
    "author unchanged",
    updatedComment.author.id,
    originalAuthorId,
  );
}
