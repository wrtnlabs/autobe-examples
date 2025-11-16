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

export async function test_api_comment_edit_history_list_access_control_for_non_author_member(
  connection: api.IConnection,
) {
  // 1. Register Member A (author) and obtain an authenticated connection
  const memberAJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberA);

  // Clone base connection into two logical connections so we don't mix tokens
  const memberAConnection: api.IConnection = { ...connection };

  // 2. Member A creates a community
  const communitySlug = `comm-${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    slug: communitySlug,
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
      memberAConnection,
      { body: communityCreateBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Member A joins the community
  const membershipABody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membershipA: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      memberAConnection,
      {
        communitySlug: community.slug,
        body: membershipABody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(membershipA);

  // 4. Member A creates a post in the community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(
      memberAConnection,
      { body: postCreateBody },
    );
  typia.assert<ICommunityPlatformPost>(post);

  TestValidator.equals(
    "post community linkage should match created community",
    post.community_id,
    community.id,
  );

  // 5. Member A creates a comment on the post
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      memberAConnection,
      {
        postId: post.id as string & tags.Format<"uuid">,
        body: commentCreateBody,
      },
    );
  typia.assert<ICommunityPlatformComment>(comment);

  TestValidator.equals(
    "comment should belong to the created post",
    comment.post.id,
    post.id,
  );

  // 6. Register Member B and obtain its own authenticated connection
  const memberBConnection: api.IConnection = { ...connection };
  const memberBJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(memberBConnection, {
      body: memberBJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberB);

  TestValidator.notEquals(
    "author and non-author member ids should differ",
    memberA.id,
    memberB.id,
  );

  // 7. Member B joins the same community
  const membershipBBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membershipB: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      memberBConnection,
      {
        communitySlug: community.slug,
        body: membershipBBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(membershipB);

  TestValidator.equals(
    "member B membership community slug should match",
    membershipB.community.slug,
    community.slug,
  );

  // 8. Member B lists edit history for Member A's comment (page 1)
  const historyRequestPage1 = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort: "created_at_desc" as const,
    hasEditReason: null,
  } satisfies ICommunityPlatformCommentEditHistory.IRequest;

  const historyPage1: IPageICommunityPlatformCommentEditHistory =
    await api.functional.communityPlatform.memberUser.comments.editHistories.index(
      memberBConnection,
      {
        commentId: comment.id as string & tags.Format<"uuid">,
        body: historyRequestPage1,
      },
    );
  typia.assert<IPageICommunityPlatformCommentEditHistory>(historyPage1);

  const pagination1 = historyPage1.pagination;
  TestValidator.equals(
    "pagination current page should be 1 for first history request",
    pagination1.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match requested pageSize",
    pagination1.limit,
    historyRequestPage1.pageSize,
  );

  // If any edit history exists, validate that it is correctly scoped to the comment/post
  if (historyPage1.data.length > 0) {
    for (const snapshot of historyPage1.data) {
      typia.assert<ICommunityPlatformCommentEditHistory>(snapshot);
      TestValidator.equals(
        "history snapshot comment id should match target comment",
        snapshot.comment.id,
        comment.id,
      );
      TestValidator.equals(
        "history snapshot comment's post id should match target post",
        snapshot.comment.post.id,
        post.id,
      );
    }
  }

  // 9. Member B requests an out-of-range page (e.g., page 1000)
  const historyRequestPageOutOfRange = {
    page: 1000 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort: "created_at_desc" as const,
    hasEditReason: null,
  } satisfies ICommunityPlatformCommentEditHistory.IRequest;

  const historyPageOutOfRange: IPageICommunityPlatformCommentEditHistory =
    await api.functional.communityPlatform.memberUser.comments.editHistories.index(
      memberBConnection,
      {
        commentId: comment.id as string & tags.Format<"uuid">,
        body: historyRequestPageOutOfRange,
      },
    );
  typia.assert<IPageICommunityPlatformCommentEditHistory>(
    historyPageOutOfRange,
  );

  const paginationOut = historyPageOutOfRange.pagination;
  TestValidator.equals(
    "out-of-range pagination current page should match requested page",
    paginationOut.current,
    historyRequestPageOutOfRange.page,
  );

  TestValidator.predicate(
    "out-of-range page should have non-negative record counts",
    paginationOut.records >= 0 &&
      paginationOut.pages >= 0 &&
      historyPageOutOfRange.data.length >= 0 &&
      historyPageOutOfRange.data.length <=
        historyRequestPageOutOfRange.pageSize,
  );
}
