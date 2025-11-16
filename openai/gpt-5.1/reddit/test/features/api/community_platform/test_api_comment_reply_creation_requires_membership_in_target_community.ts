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
 * Validate that only members of a community can create replies under its posts.
 *
 * Business intent:
 *
 * - A member user (Member A) who owns/joins a community can post and comment
 *   there, including creating nested replies.
 * - Another member user (Member B) who has not joined that community must not be
 *   allowed to create a reply under comments in that community.
 *
 * Covered workflow:
 *
 * 1. Member A joins the platform (auth.memberUser.join) and becomes the
 *    authenticated actor on the connection.
 * 2. Member A creates Community X.
 * 3. Member A creates an explicit membership in Community X so they are a valid
 *    member.
 * 4. Member A creates a post in Community X.
 * 5. Member A creates a top-level comment on that post.
 * 6. Member A successfully creates a reply under that comment (positive path for
 *    an authorized member).
 * 7. Member B joins the platform (overwriting Authorization on the same
 *    connection) but does NOT join Community X.
 * 8. Member B attempts to create a reply under the same comment and the operation
 *    must fail (business rule: membership required to reply in a community).
 *
 * Notes and constraints:
 *
 * - We cannot re-authenticate as Member A after Member B overwrites the
 *   connection’s Authorization header because no login endpoint is provided in
 *   the materials. Therefore, the positive control is executed while Member A
 *   is still authenticated (step 6), before Member B is registered.
 * - We do not rely on any reply-listing or comment-detail endpoints to count
 *   replies, as such operations are not present in the given SDK list.
 * - We assert only that Member B’s reply creation throws an error, without
 *   checking specific HTTP status codes or error payloads as per test framework
 *   constraints.
 */
export async function test_api_comment_reply_creation_requires_membership_in_target_community(
  connection: api.IConnection,
) {
  // 1. Member A joins the platform and becomes the authenticated actor.
  const memberAJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberA = await api.functional.auth.memberUser.join(connection, {
    body: memberAJoinBody,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberA);

  // 2. Member A creates Community X.
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(12),
    name: RandomGenerator.name(2),
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

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Member A creates an explicit membership in Community X.
  const membershipCreateBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(membership);

  // 4. Member A creates a post in Community X.
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post = await api.functional.communityPlatform.memberUser.posts.create(
    connection,
    {
      body: postCreateBody,
    },
  );
  typia.assert<ICommunityPlatformPost>(post);

  // 5. Member A creates a top-level parent comment on the post.
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformComment.ICreate;

  const parentComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert<ICommunityPlatformComment>(parentComment);

  // 6. Member A successfully creates a reply under that comment
  //    (positive path for an authorized community member).
  const memberAReplyBody = {
    body: RandomGenerator.paragraph({ sentences: 2 }),
    format: "markdown" as "markdown",
  } satisfies ICommunityPlatformCommentReply.ICreate;

  const memberAReply =
    await api.functional.communityPlatform.memberUser.posts.comments.replies.create(
      connection,
      {
        postId: post.id,
        commentId: parentComment.id,
        body: memberAReplyBody,
      },
    );
  typia.assert<ICommunityPlatformCommentReply>(memberAReply);

  // 7. Member B joins the platform but does not join Community X.
  const memberBJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberB = await api.functional.auth.memberUser.join(connection, {
    body: memberBJoinBody,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberB);

  // 8. Member B attempts to create a reply under the same comment without
  //    having a membership in Community X. This must fail.
  const memberBReplyBody = {
    body: RandomGenerator.paragraph({ sentences: 2 }),
    format: "markdown" as "markdown",
  } satisfies ICommunityPlatformCommentReply.ICreate;

  await TestValidator.error(
    "non-member should not be able to create reply in community",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.comments.replies.create(
        connection,
        {
          postId: post.id,
          commentId: parentComment.id,
          body: memberBReplyBody,
        },
      );
    },
  );
}
