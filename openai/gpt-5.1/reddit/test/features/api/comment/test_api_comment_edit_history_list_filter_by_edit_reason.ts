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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentEditHistory";

/**
 * Validate listing and filtering of comment edit histories by edit_reason
 * presence.
 *
 * Business flow (as far as exposed APIs allow):
 *
 * 1. Register and authenticate a member user via POST /auth/memberUser/join.
 * 2. With that member, create a community via POST
 *    /communityPlatform/memberUser/communities.
 * 3. Join that community via POST
 *    /communityPlatform/memberUser/communities/{communitySlug}/memberships.
 * 4. Create a post in the community via POST /communityPlatform/memberUser/posts.
 * 5. Create a comment under that post via POST
 *    /communityPlatform/memberUser/posts/{postId}/comments.
 * 6. Call PATCH /communityPlatform/memberUser/comments/{commentId}/editHistories
 *    twice with different hasEditReason flags to ensure the filter behaves
 *    correctly when history snapshots exist.
 *
 * Note: No comment update API is provided in the SDK definition, so this test
 * cannot actively create multiple edit history snapshots itself. Instead, it
 * focuses on the contract of the history listing endpoint and validates
 * filtering and pagination semantics against whatever snapshots exist for the
 * created comment (which may be zero in a clean environment).
 */
export async function test_api_comment_edit_history_list_filter_by_edit_reason(
  connection: api.IConnection,
) {
  // 1. Member joins (auth)
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
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

  // 3. Create a membership in that community
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

  // 4. Create a post in the community
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 5. Create a comment under the post
  const commentBody = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  // Helper to run a single history query with a particular hasEditReason flag
  const fetchHistories = async (
    hasEditReason: boolean | null | undefined,
  ): Promise<IPageICommunityPlatformCommentEditHistory> => {
    const requestBody = {
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      pageSize: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
      sort: "created_at_desc" as const,
      hasEditReason,
    } satisfies ICommunityPlatformCommentEditHistory.IRequest;

    const pageResult: IPageICommunityPlatformCommentEditHistory =
      await api.functional.communityPlatform.memberUser.comments.editHistories.index(
        connection,
        {
          commentId: comment.id,
          body: requestBody,
        },
      );
    typia.assert(pageResult);
    return pageResult;
  };

  // 6. Query histories with hasEditReason = true
  const pageWithReason = await fetchHistories(true);

  // Validate pagination metadata shape
  const paginationTrue = pageWithReason.pagination;
  TestValidator.predicate(
    "pagination current page should be >= 0",
    paginationTrue.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be >= 0",
    paginationTrue.limit >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be >= 0",
    paginationTrue.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records should be >= 0",
    paginationTrue.records >= 0,
  );

  // Validate all items (if any) have non-null edit_reason and correct comment id
  for (const history of pageWithReason.data) {
    typia.assert<ICommunityPlatformCommentEditHistory>(history);
    TestValidator.equals(
      "history comment id should match target comment id when hasEditReason=true",
      history.comment.id,
      comment.id,
    );
    TestValidator.predicate(
      "edit_reason must be non-null when hasEditReason=true",
      history.edit_reason !== null && history.edit_reason !== undefined,
    );
  }

  // 7. Query histories with hasEditReason = false
  const pageWithoutReason = await fetchHistories(false);

  const paginationFalse = pageWithoutReason.pagination;
  TestValidator.predicate(
    "pagination (hasEditReason=false) current page should be >= 0",
    paginationFalse.current >= 0,
  );
  TestValidator.predicate(
    "pagination (hasEditReason=false) limit should be >= 0",
    paginationFalse.limit >= 0,
  );
  TestValidator.predicate(
    "pagination (hasEditReason=false) pages should be >= 0",
    paginationFalse.pages >= 0,
  );
  TestValidator.predicate(
    "pagination (hasEditReason=false) records should be >= 0",
    paginationFalse.records >= 0,
  );

  for (const history of pageWithoutReason.data) {
    typia.assert<ICommunityPlatformCommentEditHistory>(history);
    TestValidator.equals(
      "history comment id should match target comment id when hasEditReason=false",
      history.comment.id,
      comment.id,
    );
    TestValidator.predicate(
      "edit_reason must be null when hasEditReason=false",
      history.edit_reason === null,
    );
  }

  // 8. Also ensure that requesting without hasEditReason does not break
  const pageUnfiltered = await fetchHistories(undefined);
  const paginationUnfiltered = pageUnfiltered.pagination;
  TestValidator.predicate(
    "pagination (unfiltered) current page should be >= 0",
    paginationUnfiltered.current >= 0,
  );
  TestValidator.predicate(
    "pagination (unfiltered) limit should be >= 0",
    paginationUnfiltered.limit >= 0,
  );
  TestValidator.predicate(
    "pagination (unfiltered) pages should be >= 0",
    paginationUnfiltered.pages >= 0,
  );
  TestValidator.predicate(
    "pagination (unfiltered) records should be >= 0",
    paginationUnfiltered.records >= 0,
  );

  for (const history of pageUnfiltered.data) {
    typia.assert<ICommunityPlatformCommentEditHistory>(history);
    TestValidator.equals(
      "history comment id should match target comment id when unfiltered",
      history.comment.id,
      comment.id,
    );
  }
}
