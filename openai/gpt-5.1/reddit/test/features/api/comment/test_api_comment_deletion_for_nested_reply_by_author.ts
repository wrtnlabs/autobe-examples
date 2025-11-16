import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

/**
 * Validate deletion of a nested reply comment by its author.
 *
 * Business intent:
 *
 * - A member user can create a post, add a top-level comment, then add a nested
 *   reply to that comment, and finally delete that reply via DELETE
 *   /communityPlatform/memberUser/posts/{postId}/comments/{commentId}.
 * - The delete operation should succeed for the author context and target only
 *   the reply comment.
 *
 * Due to the limited SDK surface for read/list operations on comments, this
 * test focuses on what is observable through the provided APIs:
 *
 * 1. Join as a member user (auth.memberUser.join).
 * 2. Create a community as that member user.
 * 3. Create a post under that community.
 * 4. Create a top-level parent comment on the post.
 * 5. Create a nested reply comment pointing to the parent.
 * 6. Delete the reply using the same authenticated member user.
 *
 * We assert:
 *
 * - All creation responses conform to their DTO types via typia.assert.
 * - Parent comment is top-level (no parentComment) and belongs to the post.
 * - Reply comment references the parent as its parentComment and belongs to the
 *   same post and author.
 * - The erase call completes without throwing when executed by the author.
 */
export async function test_api_comment_deletion_for_nested_reply_by_author(
  connection: api.IConnection,
) {
  // 1. Join as a member user and obtain authorization context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    // We intentionally omit ip to let the server derive it if needed
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);
  typia.assert<IAuthorizationToken>(memberAuthorized.token);

  // 2. Create a community to host the post and comment thread
  const communityBody = {
    identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: "public",
    isNsfw: false,
    // no primaryTagIds to keep the test simple and independent of tag masters
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // The creator of the community should be the joined member user
  TestValidator.equals(
    "community creator matches joined member user",
    community.creator.id,
    memberAuthorized.id,
  );

  // 3. Create a post in that community
  const postBody = {
    community_id: community.id,
    post_type_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    // url and image_uri left null/undefined to represent a text-style post
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert<ICommunityPlatformPost>(post);

  TestValidator.equals(
    "created post belongs to created community",
    post.community.id,
    community.id,
  );

  // 4. Create a top-level parent comment (no parentCommentId)
  const parentCommentBody = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
    // no parentCommentId -> top-level
    renderingMode: "markdown" as const,
  } satisfies ICommunityPlatformComment.ICreate;

  const parentComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: parentCommentBody,
      },
    );
  typia.assert<ICommunityPlatformComment>(parentComment);

  TestValidator.equals(
    "parent comment belongs to created post",
    parentComment.post.id,
    post.id,
  );
  TestValidator.equals(
    "parent comment has no parentComment (top-level)",
    parentComment.parentComment,
    null,
  );
  TestValidator.equals(
    "parent comment author matches member user",
    parentComment.author.id,
    memberAuthorized.id,
  );

  // 5. Create a nested reply comment under the parent comment
  const replyCommentBody = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    parentCommentId: parentComment.id,
    renderingMode: "markdown" as const,
  } satisfies ICommunityPlatformComment.ICreate;

  const replyComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: replyCommentBody,
      },
    );
  typia.assert<ICommunityPlatformComment>(replyComment);

  // Validate structure of the reply
  TestValidator.equals(
    "reply comment belongs to same post as parent",
    replyComment.post.id,
    post.id,
  );
  TestValidator.predicate(
    "reply comment has parentComment populated",
    replyComment.parentComment !== null,
  );
  if (replyComment.parentComment !== null) {
    TestValidator.equals(
      "reply's parentComment.id matches parent comment id",
      replyComment.parentComment.id,
      parentComment.id,
    );
  }
  TestValidator.equals(
    "reply comment author matches member user",
    replyComment.author.id,
    memberAuthorized.id,
  );

  // 6. Delete the nested reply comment as its author
  await api.functional.communityPlatform.memberUser.posts.comments.erase(
    connection,
    {
      postId: post.id,
      commentId: replyComment.id,
    },
  );

  // If erase completes without throwing, we treat it as a success for this
  // positive-path test. We cannot verify server-side state further without
  // additional read/list endpoints for comments.
  TestValidator.predicate(
    "erase of reply comment by its author completed without error",
    true,
  );
}
