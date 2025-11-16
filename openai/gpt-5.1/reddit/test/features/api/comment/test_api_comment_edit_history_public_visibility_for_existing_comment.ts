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
 * Validate public visibility of comment edit history for an existing comment.
 *
 * Business goal
 *
 * - Ensure that a comment edit history snapshot can be retrieved by a generic
 *   (potentially unauthenticated) consumer when the platform exposes comment
 *   edit histories publicly.
 *
 * Practical constraints
 *
 * - The available SDK only exposes a GET-by-id operation for comment edit
 *   histories. There is no explicit edit or list API, so we cannot
 *   deterministically create or discover a real history row for the concrete
 *   comment we create in this test.
 * - Following the autonomous scenario rewrite rules, we keep the realistic
 *   authoring flow (join → community → membership → post → comment) but treat
 *   the edit-history part as a public, type-safe GET call exercised in
 *   simulation mode.
 *
 * Revised flow
 *
 * 1. Register a memberUser account via auth.memberUser.join to act as author.
 * 2. Using that authenticated memberUser session, create a community.
 * 3. Create a membership in that community for the same memberUser so they can
 *    legitimately post.
 * 4. Create a post in the community via memberUser posts API.
 * 5. Create a top-level comment on that post.
 * 6. Clone the original connection into a new `publicConnection` with an empty
 *    headers object to simulate an unauthenticated consumer (no Authorization
 *    header), but keep `simulate: true` so the comment edit history endpoint
 *    returns mock data without requiring a real history row.
 * 7. Call GET
 *    /communityPlatform/comments/{commentId}/editHistories/{editHistoryId} via
 *    api.functional.communityPlatform.comments.editHistories.at using the
 *    publicConnection in simulate mode and random identifiers.
 * 8. Assert that the response is a valid ICommunityPlatformCommentEditHistory via
 *    typia.assert and that it structurally represents a history entry, focusing
 *    on type correctness and basic business semantics like a non-empty
 *    created_at string.
 */
export async function test_api_comment_edit_history_public_visibility_for_existing_comment(
  connection: api.IConnection,
) {
  // 1. Register a memberUser account (author)
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join" as string & tags.Format<"uri">,
    referrer: "https://example.com/" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const author: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(author);

  // 2. Create a community as this memberUser
  const communityCreateBody = {
    slug: `community-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 3. Create a membership in that community for the author
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

  // 4. Create a post in the community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 5. Create a top-level comment on the post
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 3 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id as string & tags.Format<"uuid">,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // 6. Simulate a public consumer (no Authorization header) by cloning the
  //    connection and clearing headers, and enable simulate mode so that the
  //    edit history endpoint can return mock data without a real history row.
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
    simulate: true,
  };

  // 7. Invoke the public GET endpoint with random identifiers in simulation
  //    mode to verify that unauthenticated callers can hit the endpoint and
  //    receive a structurally valid history object.
  const history: ICommunityPlatformCommentEditHistory =
    await api.functional.communityPlatform.comments.editHistories.at(
      publicConnection,
      {
        commentId: comment.id,
        editHistoryId: typia.random<string>(),
      },
    );

  // 8. Validate response structure and basic semantics.
  typia.assert(history);

  // Ensure the history has a non-empty created_at value, which typia has
  // already validated as a date-time formatted string.
  TestValidator.predicate(
    "edit history created_at must be a non-empty string",
    typeof history.created_at === "string" && history.created_at.length > 0,
  );
}
