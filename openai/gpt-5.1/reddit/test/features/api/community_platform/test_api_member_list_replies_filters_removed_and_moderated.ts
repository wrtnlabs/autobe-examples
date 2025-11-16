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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentReply";

export async function test_api_member_list_replies_filters_removed_and_moderated(
  connection: api.IConnection,
) {
  // 1. Register a member user (auth.memberUser.join)
  const joinInput = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinInput,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(member);

  // 2. Create a community
  const communityCreateBody = {
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
      {
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Create membership in the community
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
  typia.assert<ICommunityPlatformCommunityMembership>(membership);

  // 4. Create a post in that community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert<ICommunityPlatformPost>(post);

  // 5. Create a parent comment
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const parentComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert<ICommunityPlatformComment>(parentComment);

  // 6. Create multiple replies (at least 3)
  const replyCount = 3;
  const replies: ICommunityPlatformCommentReply[] = [];

  for (let i = 0; i < replyCount; i++) {
    const replyCreateBody = {
      body: RandomGenerator.paragraph({ sentences: 2 }),
      format: RandomGenerator.pick(["plain", "markdown"] as const),
      replyContext: undefined,
    } satisfies ICommunityPlatformCommentReply.ICreate;

    const reply: ICommunityPlatformCommentReply =
      await api.functional.communityPlatform.memberUser.posts.comments.replies.create(
        connection,
        {
          postId: post.id,
          commentId: parentComment.id,
          body: replyCreateBody,
        },
      );
    typia.assert<ICommunityPlatformCommentReply>(reply);
    replies.push(reply);
  }

  // Helper to assert that all created reply IDs are present in a list of summaries
  const assertAllRepliesPresent = (
    title: string,
    page: IPageICommunityPlatformCommentReply.ISummary,
  ): void => {
    typia.assert<IPageICommunityPlatformCommentReply.ISummary>(page);
    const ids = page.data.map((s) => s.id);
    for (const r of replies) {
      TestValidator.predicate(
        `${title} - contains reply ${r.id}`,
        ids.includes(r.id),
      );
    }
  };

  // 7. Index replies with various filter combinations
  // 7-1. Default listing (omit includeRemoved/includeModerated)
  const defaultRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    cursor: undefined,
    sortBy: "createdAtAsc" as const,
    includeModerated: undefined,
    includeRemoved: undefined,
  } satisfies ICommunityPlatformCommentReply.IRequest;

  const defaultPage: IPageICommunityPlatformCommentReply.ISummary =
    await api.functional.communityPlatform.memberUser.posts.comments.replies.index(
      connection,
      {
        postId: post.id,
        commentId: parentComment.id,
        body: defaultRequestBody,
      },
    );
  assertAllRepliesPresent("default listing", defaultPage);

  // 7-2. Explicit includeRemoved=false, includeModerated=false
  const excludeRemovedModeratedBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    cursor: undefined,
    sortBy: "createdAtAsc" as const,
    includeModerated: false,
    includeRemoved: false,
  } satisfies ICommunityPlatformCommentReply.IRequest;

  const excludeRemovedModeratedPage: IPageICommunityPlatformCommentReply.ISummary =
    await api.functional.communityPlatform.memberUser.posts.comments.replies.index(
      connection,
      {
        postId: post.id,
        commentId: parentComment.id,
        body: excludeRemovedModeratedBody,
      },
    );
  assertAllRepliesPresent(
    "exclude removed & moderated",
    excludeRemovedModeratedPage,
  );

  // Ensure that default and explicit-false pages have the same set of IDs
  const defaultIds = defaultPage.data.map((s) => s.id).sort();
  const explicitFalseIds = excludeRemovedModeratedPage.data
    .map((s) => s.id)
    .sort();
  TestValidator.equals(
    "default vs explicit false include flags should have same IDs",
    defaultIds,
    explicitFalseIds,
  );

  // 7-3. includeRemoved=true and includeModerated=true
  const includeRemovedModeratedBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    cursor: undefined,
    sortBy: "createdAtAsc" as const,
    includeModerated: true,
    includeRemoved: true,
  } satisfies ICommunityPlatformCommentReply.IRequest;

  const includeRemovedModeratedPage: IPageICommunityPlatformCommentReply.ISummary =
    await api.functional.communityPlatform.memberUser.posts.comments.replies.index(
      connection,
      {
        postId: post.id,
        commentId: parentComment.id,
        body: includeRemovedModeratedBody,
      },
    );
  assertAllRepliesPresent(
    "include removed & moderated",
    includeRemovedModeratedPage,
  );

  // 7-4. Sort order checks using createdAtAsc vs createdAtDesc
  const ascBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    cursor: undefined,
    sortBy: "createdAtAsc" as const,
    includeModerated: undefined,
    includeRemoved: undefined,
  } satisfies ICommunityPlatformCommentReply.IRequest;

  const ascPage: IPageICommunityPlatformCommentReply.ISummary =
    await api.functional.communityPlatform.memberUser.posts.comments.replies.index(
      connection,
      {
        postId: post.id,
        commentId: parentComment.id,
        body: ascBody,
      },
    );

  const descBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    cursor: undefined,
    sortBy: "createdAtDesc" as const,
    includeModerated: undefined,
    includeRemoved: undefined,
  } satisfies ICommunityPlatformCommentReply.IRequest;

  const descPage: IPageICommunityPlatformCommentReply.ISummary =
    await api.functional.communityPlatform.memberUser.posts.comments.replies.index(
      connection,
      {
        postId: post.id,
        commentId: parentComment.id,
        body: descBody,
      },
    );

  // Ensure asc/desc pages contain the created replies
  assertAllRepliesPresent("createdAtAsc listing", ascPage);
  assertAllRepliesPresent("createdAtDesc listing", descPage);

  // For asc/desc comparison, focus only on the subset of summaries for created replies
  const selectSummariesForReplies = (
    page: IPageICommunityPlatformCommentReply.ISummary,
  ): ICommunityPlatformCommentReply.ISummary[] => {
    const map = new Map<string, ICommunityPlatformCommentReply.ISummary>();
    for (const summary of page.data) map.set(summary.id, summary);
    return replies
      .map((r) => map.get(r.id))
      .filter(
        (s): s is ICommunityPlatformCommentReply.ISummary => s !== undefined,
      );
  };

  const ascSubset = selectSummariesForReplies(ascPage);
  const descSubset = selectSummariesForReplies(descPage);

  // Check that ascSubset is ordered by created_at ascending
  for (let i = 1; i < ascSubset.length; i++) {
    const prev = new Date(ascSubset[i - 1].created_at).getTime();
    const curr = new Date(ascSubset[i].created_at).getTime();
    TestValidator.predicate("createdAtAsc ordering", prev <= curr);
  }

  // Check that descSubset is ordered by created_at descending
  for (let i = 1; i < descSubset.length; i++) {
    const prev = new Date(descSubset[i - 1].created_at).getTime();
    const curr = new Date(descSubset[i].created_at).getTime();
    TestValidator.predicate("createdAtDesc ordering", prev >= curr);
  }
}
