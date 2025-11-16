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
 * Ensure that a member user cannot update a reply authored by another member.
 *
 * Business goal:
 *
 * - Validate that the reply update endpoint enforces author-based permissions,
 *   rejecting updates from a different authenticated member user while
 *   preserving the reply’s state.
 *
 * Scenario steps:
 *
 * 1. Member A joins the platform (auth.memberUser.join) and becomes the
 *    authenticated member on the shared connection.
 * 2. Member A creates a community that allows text posts.
 * 3. Member A joins that community as a regular member via memberships.create.
 * 4. Member A creates a post in that community.
 * 5. Member A creates a top-level comment for that post.
 * 6. Member A creates a reply under that comment and we capture its initial
 *    content, status, and is_locked state.
 * 7. Member B joins the platform via a second auth.memberUser.join call, which
 *    switches the SDK connection’s Authorization header to Member B.
 * 8. As Member B, attempt to update the reply using
 *    communityPlatform.memberUser.posts.comments.replies.update with an
 *    ICommunityPlatformComment.IUpdate body that changes body, status and
 *    is_locked.
 * 9. Assert that the update call throws an error (business/authorization failure)
 *    when executed as Member B.
 * 10. Assert that the originally captured reply snapshot has not changed in our
 *     local copy (content, status, is_locked are still equal to the original
 *     values), modelling that a failed update does not mutate reply state.
 *
 * Notes:
 *
 * - We do not assert HTTP status codes or inspect HttpError details; we only
 *   assert that an error occurs.
 * - There is no GET-by-id reply endpoint provided, so we cannot re-fetch the
 *   reply; integrity is validated against the captured pre-update object.
 */
export async function test_api_member_reply_update_fails_for_non_author(
  connection: api.IConnection,
) {
  // 1. Member A joins and becomes the current authenticated member.
  const memberAJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAAuthorized = await api.functional.auth.memberUser.join(
    connection,
    {
      body: memberAJoinBody,
    },
  );
  typia.assert(memberAAuthorized);

  // 2. Member A creates a community.
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: false,
    allow_image_posts: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 3. Member A joins the community.
  const membershipCreateBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership);

  // 4. Member A creates a post in the community.
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 6 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 5. Member A creates a top-level comment under the post.
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // 6. Member A creates a reply under that comment.
  const replyCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 2 }),
    format: "plain",
    replyContext: undefined,
  } satisfies ICommunityPlatformCommentReply.ICreate;

  const reply: ICommunityPlatformCommentReply =
    await api.functional.communityPlatform.memberUser.posts.comments.replies.create(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: replyCreateBody,
      },
    );
  typia.assert(reply);

  // Capture original reply state for integrity checks.
  const originalContent = reply.content;
  const originalStatus = reply.status;
  const originalIsLocked = reply.is_locked;

  // 7. Member B joins (this switches Authorization in the shared connection).
  const memberBJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join-b",
    referrer: "https://example.com/landing-b",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberBAuthorized = await api.functional.auth.memberUser.join(
    connection,
    {
      body: memberBJoinBody,
    },
  );
  typia.assert(memberBAuthorized);

  // 8. As Member B, attempt to update Member A's reply.
  const maliciousUpdateBody = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    status: "hidden_by_wrong_user",
    is_locked: !originalIsLocked,
  } satisfies ICommunityPlatformComment.IUpdate;

  await TestValidator.error(
    "non-author member user cannot update another member's reply",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.comments.replies.update(
        connection,
        {
          postId: post.id,
          commentId: comment.id,
          replyId: reply.id,
          body: maliciousUpdateBody,
        },
      );
    },
  );

  // 9. Local integrity: ensure our captured reply snapshot has not changed.
  TestValidator.equals(
    "reply content remains unchanged after failed update attempt",
    reply.content,
    originalContent,
  );
  TestValidator.equals(
    "reply status remains unchanged after failed update attempt",
    reply.status,
    originalStatus,
  );
  TestValidator.equals(
    "reply is_locked flag remains unchanged after failed update attempt",
    reply.is_locked,
    originalIsLocked,
  );
}
