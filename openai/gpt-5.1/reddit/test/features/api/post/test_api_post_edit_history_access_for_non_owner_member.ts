import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostEditHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostEditHistory";

/**
 * Verify that a non-owner authenticated memberUser can access edit history for
 * another member's post when authorized, and that history records are correctly
 * scoped to the target post.
 *
 * Business context
 *
 * - The community platform stores posts in community_platform_posts and immutable
 *   edit snapshots in community_platform_post_edit_histories.
 * - This endpoint exposes a paginated, filterable list of edit histories for a
 *   given postId, for authenticated memberUser actors.
 * - The scenario validates that a regular member (not the author) can still
 *   retrieve histories when the platform configuration permits such access.
 *
 * Covered steps
 *
 * 1. Register memberUser A using auth.memberUser.join.
 * 2. As memberUser A, create a community via
 *    communityPlatform.memberUser.communities.create.
 * 3. As memberUser A, create a post in that community via
 *    communityPlatform.memberUser.posts.create.
 * 4. Register memberUser B using auth.memberUser.join. The SDK join helper
 *    automatically overwrites connection.headers.Authorization each time, so
 *    the connection now represents memberUser B.
 * 5. As memberUser B, invoke
 *    communityPlatform.memberUser.posts.editHistories.index on the postId from
 *    memberUser A's post, with a simple IRequest body (page/limit and leaving
 *    filters undefined).
 * 6. Assert that the response:
 *
 *    - Conforms to IPageICommunityPlatformPostEditHistory.ISummary using
 *         typia.assert,
 *    - Has pagination data with non-negative ints, and
 *    - Contains only histories whose post_id matches the target post id (when data
 *         exists).
 *
 * Notes
 *
 * - We do not assert whether access is allowed or forbidden by business rules via
 *   HTTP status codes because the SDK surface does not expose HttpError status
 *   in a typed way here and the generator guidance discourages status-specific
 *   testing. Instead, we treat successful invocation as the allowed case; if
 *   the backend forbids access, the test framework will see an exception and
 *   fail this scenario.
 */
export async function test_api_post_edit_history_access_for_non_owner_member(
  connection: api.IConnection,
) {
  // 1. Register memberUser A (author account)
  const memberUserAJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberUserA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUserAJoinBody,
    });
  typia.assert(memberUserA);

  // 2. As memberUser A, create a community
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
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
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. As memberUser A, create a post in the community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 4. Register memberUser B (non-owner) — this overwrites Authorization
  const memberUserBJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberUserB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUserBJoinBody,
    });
  typia.assert(memberUserB);

  // 5. As memberUser B (non-owner), request edit histories for A's post
  const requestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    sort_direction: "desc" as const,
    editor_memberuser_id: undefined,
    edited_from: undefined,
    edited_to: undefined,
  } satisfies ICommunityPlatformPostEditHistory.IRequest;

  const historiesPage: IPageICommunityPlatformPostEditHistory.ISummary =
    await api.functional.communityPlatform.memberUser.posts.editHistories.index(
      connection,
      {
        postId: post.id,
        body: requestBody,
      },
    );
  typia.assert(historiesPage);

  // 6. Validate pagination basics and post scoping semantics
  const pagination: IPage.IPagination = historiesPage.pagination;
  typia.assert(pagination);

  TestValidator.predicate(
    "pagination current page should be non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    pagination.pages >= 0,
  );

  // Ensure all history entries (if any) are for the requested postId
  await ArrayUtil.asyncForEach(historiesPage.data, async (history, index) => {
    typia.assert<ICommunityPlatformPostEditHistory.ISummary>(history);
    TestValidator.equals(
      `history ${index} post_id should match target post.id`,
      history.post_id,
      post.id,
    );
  });
}
