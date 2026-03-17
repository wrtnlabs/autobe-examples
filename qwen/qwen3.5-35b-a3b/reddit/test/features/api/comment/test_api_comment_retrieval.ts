import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_comment_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Generate random identifiers for postId and commentId
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const commentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the comment
  const comment = await api.functional.redditCommunity.member.posts.comments.at(
    memberConnection,
    {
      postId,
      commentId,
    },
  );
  typia.assert(comment);
  // 4. Validate comment structure and relationships
  // Author information
  TestValidator.equals(
    "author username has length",
    comment.author.username.length > 0,
    true,
  );
  TestValidator.equals("author has id", comment.author.id !== undefined, true);
  TestValidator.equals(
    "author created_at exists",
    comment.author.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "author profile exists",
    comment.author.profile !== undefined,
    true,
  );
  if (comment.author.profile) {
    TestValidator.equals(
      "display_name exists",
      comment.author.profile.display_name !== undefined,
      true,
    );
    TestValidator.equals(
      "karma exists",
      comment.author.karma !== undefined,
      true,
    );
  }
  // Comment content
  TestValidator.equals("body has content", comment.body.length > 0, true);
  TestValidator.equals(
    "vote_score is valid",
    comment.vote_score !== undefined,
    true,
  );
  TestValidator.equals(
    "created_at format",
    comment.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "updated_at format",
    comment.updated_at !== undefined,
    true,
  );
  TestValidator.equals(
    "deleted_at is nullable",
    comment.deleted_at === null || comment.deleted_at !== undefined,
    true,
  );
  // Post context
  TestValidator.equals("post id exists", comment.post.id !== undefined, true);
  TestValidator.equals(
    "post title has content",
    comment.post.title.length > 0,
    true,
  );
  TestValidator.equals(
    "post vote_score exists",
    comment.post.vote_score !== undefined,
    true,
  );
  TestValidator.equals(
    "post comment_count exists",
    comment.post.comment_count !== undefined,
    true,
  );
  TestValidator.equals(
    "post type is valid",
    ["text", "link", "image"].includes(comment.post.post_type),
    true,
  );
  TestValidator.equals(
    "post preview_content is nullable",
    comment.post.preview_content === null ||
      comment.post.preview_content !== undefined,
    true,
  );
  // Parent comment relationship (for nested replies)
  TestValidator.equals(
    "parent_comment is nullable",
    comment.parent === null || comment.parent !== undefined,
    true,
  );
  if (comment.parent) {
    TestValidator.equals(
      "parent has id",
      comment.parent.id !== undefined,
      true,
    );
    TestValidator.equals(
      "parent voteScore exists",
      comment.parent.voteScore !== undefined,
      true,
    );
    TestValidator.equals(
      "parent replyCount exists",
      comment.parent.replyCount !== undefined,
      true,
    );
  }
  // Replies (nested thread support)
  TestValidator.equals(
    "replies array exists",
    Array.isArray(comment.replies),
    true,
  );
  TestValidator.equals(
    "replies count is valid",
    comment.replies.length >= 0,
    true,
  );
  // 5. Validate author relationship on post
  TestValidator.equals(
    "post author exists",
    comment.post.author !== undefined,
    true,
  );
  // 6. Validate community relationship on post
  TestValidator.equals(
    "post community exists",
    comment.post.community !== undefined,
    true,
  );
  // 7. Validate post author profile
  if (comment.post.author.profile) {
    TestValidator.equals(
      "post author display_name exists",
      comment.post.author.profile.display_name !== undefined,
      true,
    );
  }
  // 8. Validate community owner
  TestValidator.equals(
    "community owner exists",
    comment.post.community.owner !== undefined,
    true,
  );
}
