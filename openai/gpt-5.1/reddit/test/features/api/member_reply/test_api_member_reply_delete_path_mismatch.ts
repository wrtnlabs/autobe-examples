import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReply } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReply";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validate that deleting a reply enforces post/comment path consistency.
 *
 * This E2E test creates a full discussion context (member user, community,
 * membership, posts, comment, reply) and then exercises the DELETE
 * /communityPlatform/memberUser/posts/{postId}/comments/{commentId}/replies/{replyId}
 * endpoint with both invalid and valid path parameter combinations.
 *
 * Steps:
 *
 * 1. Register a new member user via auth.memberUser.join, which also authenticates
 *    the connection as that memberUser.
 * 2. Create a community via communityPlatform.memberUser.communities.create.
 * 3. Join the created community via
 *    communityPlatform.memberUser.communities.memberships.create.
 * 4. Create two posts (postA and postB) in the same community via
 *    communityPlatform.memberUser.posts.create.
 * 5. Under postA, create a top-level parent comment via
 *    communityPlatform.memberUser.posts.comments.create.
 * 6. Under postA/commentA, create a reply via
 *    communityPlatform.memberUser.posts.comments.replies.create.
 * 7. Attempt to delete the reply with mismatched path parameters: 7-1. Call
 *    replies.erase using postIdB together with the original commentIdA and
 *    replyId, expecting an HttpError because the reply does not belong to
 *    postB. 7-2. Create another comment (commentB) under postA, then call
 *    replies.erase using postIdA and commentIdB with the same replyId,
 *    expecting an HttpError because the reply does not belong to commentB.
 * 8. Finally, call replies.erase with the correct combination of postIdA,
 *    commentIdA, and replyId and assert that it succeeds (no error).
 *
 * Key validations:
 *
 * - The delete endpoint checks that the reply belongs to both the specified post
 *   and parent comment, and rejects mismatched combinations.
 * - Misaligned path parameters do not accidentally delete unrelated replies.
 * - After failed attempts, a correct delete still works, proving the reply
 *   remained until the valid call.
 */
export async function test_api_member_reply_delete_path_mismatch(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new member user
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a community
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Join the created community
  const membershipBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipBody,
      },
    );
  typia.assert(membership);

  // 4. Create two posts in the same community
  const postABody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const postA: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postABody,
    });
  typia.assert(postA);

  const postBBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const postB: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBBody,
    });
  typia.assert(postB);

  // 5. Create a parent comment under postA
  const commentABody = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const commentA: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: postA.id,
        body: commentABody,
      },
    );
  typia.assert(commentA);

  // 6. Create a reply under postA/commentA
  const replyBody = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    format: "markdown",
    replyContext: undefined,
  } satisfies ICommunityPlatformCommentReply.ICreate;

  const reply: ICommunityPlatformCommentReply =
    await api.functional.communityPlatform.memberUser.posts.comments.replies.create(
      connection,
      {
        postId: postA.id,
        commentId: commentA.id,
        body: replyBody,
      },
    );
  typia.assert(reply);

  // 7-1. Attempt to delete with mismatched postId (postB) while using
  //       commentIdA and replyId: expect error
  await TestValidator.error(
    "delete reply with mismatched postId should fail",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.comments.replies.erase(
        connection,
        {
          postId: postB.id,
          commentId: commentA.id,
          replyId: reply.id,
        },
      );
    },
  );

  // 7-2. Create another parent comment under postA and attempt delete with
  //       mismatched commentId
  const commentBBody = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const commentB: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: postA.id,
        body: commentBBody,
      },
    );
  typia.assert(commentB);

  await TestValidator.error(
    "delete reply with mismatched commentId should fail",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.comments.replies.erase(
        connection,
        {
          postId: postA.id,
          commentId: commentB.id,
          replyId: reply.id,
        },
      );
    },
  );

  // 8. Finally delete with correct combination; should succeed with no error
  await api.functional.communityPlatform.memberUser.posts.comments.replies.erase(
    connection,
    {
      postId: postA.id,
      commentId: commentA.id,
      replyId: reply.id,
    },
  );
}
