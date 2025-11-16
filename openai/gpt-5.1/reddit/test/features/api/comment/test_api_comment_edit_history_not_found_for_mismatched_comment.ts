import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentEditHistory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validate that the comment edit-history endpoint does not leak or accept
 * history entries when the supplied commentId does not own the editHistoryId.
 *
 * Business intent:
 *
 * - Edit histories for comments are scoped by both commentId and editHistoryId.
 * - A history snapshot that conceptually belongs to one comment must not be
 *   retrievable through another comment's identifier.
 * - From an API consumer perspective, any mismatch should be observable as a
 *   not-found style failure, but this test only cares that an error occurs, not
 *   the exact HTTP status code.
 *
 * Test strategy and limitations:
 *
 * - Available APIs let us create member users, communities, memberships, posts,
 *   and comments, and read a specific edit history by (commentId,
 *   editHistoryId).
 * - There is no exposed API to edit comments and thereby generate real
 *   edit-history rows, so we cannot programmatically create a valid
 *   editHistoryId tied to a known comment.
 * - Instead, to remain compatible with both real and simulate modes, we treat any
 *   random UUID as a foreign editHistoryId: in a real backend this should
 *   behave like "no such history for this comment"; in simulate mode the
 *   random-path logic is already handled internally by the SDK and must still
 *   accept our parameter types.
 *
 * Therefore, the core of this test is:
 *
 * 1. Fully exercise the normal content-author flow up to comments to ensure we are
 *    using realistic IDs and an authenticated context.
 * 2. Then invoke the edit-history endpoint with a mismatched pair of identifiers:
 *    a real comment's id and an unrelated random editHistoryId.
 * 3. Assert that the call fails using TestValidator.error, without asserting any
 *    specific error type or HTTP status.
 */
export async function test_api_comment_edit_history_not_found_for_mismatched_comment(
  connection: api.IConnection,
) {
  // 1. Register a new member user to act as the content author.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a community where the posts and comments will live.
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

  // 3. Create a membership for the authenticated member in this community.
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

  // 4. Create two posts in the community: Post A and Post B.
  const postABody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
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
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const postB: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBBody,
    });
  typia.assert(postB);

  // 5. Create Comment A on Post A and Comment B on Post B.
  const commentABody = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const commentA: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: postA.id as string & tags.Format<"uuid">,
        body: commentABody,
      },
    );
  typia.assert(commentA);

  const commentBBody = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const commentB: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: postB.id as string & tags.Format<"uuid">,
        body: commentBBody,
      },
    );
  typia.assert(commentB);

  // 6. Construct a mismatched (or non-existent) editHistoryId.
  //    We use a random UUID string that, with overwhelming probability,
  //    does not correspond to a real history entry for commentB.
  const foreignEditHistoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 7. Call the editHistories.at endpoint with the mismatched pair and
  //    assert that an error is thrown (any error, no status check).
  await TestValidator.error(
    "edit history lookup must fail when commentId and editHistoryId do not match",
    async () => {
      await api.functional.communityPlatform.comments.editHistories.at(
        connection,
        {
          commentId: commentB.id,
          editHistoryId: foreignEditHistoryId,
        },
      );
    },
  );
}
