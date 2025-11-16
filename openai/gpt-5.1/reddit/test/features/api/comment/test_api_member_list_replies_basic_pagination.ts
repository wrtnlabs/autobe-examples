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

/**
 * Validate basic pagination when listing replies under a parent comment.
 *
 * Business flow:
 *
 * 1. Register a member user (join) and obtain an authenticated session.
 * 2. Create a community as that member.
 * 3. Join the created community.
 * 4. Create a post in that community.
 * 5. Create a parent comment on the post.
 * 6. Create multiple replies (3) under that parent comment.
 * 7. List replies with page=1, limit=2, sortBy=createdAtAsc and verify:
 *
 *    - Pagination metadata (limit, current, records, pages).
 *    - Only replies for the given post and parent comment are returned.
 *    - Returned reply count matches the limit.
 *    - Author and ordering constraints.
 * 8. List replies with page=2, limit=2 and verify the remaining reply is returned
 *    and maintains correct scoping and ordering.
 */
export async function test_api_member_list_replies_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Join a member user
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://example.com/signup",
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
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  // 3. Join the community
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

  // 5. Create a parent comment on the post
  const parentCommentBody = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const parentComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id as string & tags.Format<"uuid">,
        body: parentCommentBody,
      },
    );
  typia.assert(parentComment);

  // 6. Create multiple replies (3) under the parent comment
  const replyBodies: ICommunityPlatformCommentReply.ICreate[] =
    ArrayUtil.repeat(
      3,
      (index) =>
        ({
          body: RandomGenerator.paragraph({ sentences: 3 + index }),
          format: "plain",
          replyContext: `reply-${index}`,
        }) satisfies ICommunityPlatformCommentReply.ICreate,
    );

  const replies: ICommunityPlatformCommentReply[] = [];
  for (const body of replyBodies) {
    const reply: ICommunityPlatformCommentReply =
      await api.functional.communityPlatform.memberUser.posts.comments.replies.create(
        connection,
        {
          postId: post.id as string & tags.Format<"uuid">,
          commentId: parentComment.id as string & tags.Format<"uuid">,
          body,
        },
      );
    typia.assert(reply);
    replies.push(reply);
  }

  TestValidator.equals("created replies count should be 3", replies.length, 3);

  // 7. List replies - first page (page=1, limit=2, createdAtAsc)
  const firstPageRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 2 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    cursor: undefined,
    sortBy: "createdAtAsc" as const,
    includeModerated: undefined,
    includeRemoved: undefined,
  } satisfies ICommunityPlatformCommentReply.IRequest;

  const firstPage: IPageICommunityPlatformCommentReply.ISummary =
    await api.functional.communityPlatform.memberUser.posts.comments.replies.index(
      connection,
      {
        postId: post.id as string & tags.Format<"uuid">,
        commentId: parentComment.id as string & tags.Format<"uuid">,
        body: firstPageRequestBody,
      },
    );
  typia.assert(firstPage);

  const firstPagination = firstPage.pagination;
  const firstData = firstPage.data;

  TestValidator.equals(
    "first page limit should be 2",
    firstPagination.limit,
    2,
  );
  TestValidator.equals(
    "first page current should be 1",
    firstPagination.current,
    1,
  );
  TestValidator.equals("total records should be 3", firstPagination.records, 3);
  TestValidator.equals("total pages should be 2", firstPagination.pages, 2);
  TestValidator.equals(
    "first page data length should be 2",
    firstData.length,
    2,
  );

  for (const summary of firstData) {
    TestValidator.equals(
      "reply summary post_id should match post.id",
      summary.post_id,
      post.id,
    );
    TestValidator.equals(
      "reply summary parent_comment_id should match parentComment.id",
      summary.parent_comment_id,
      parentComment.id,
    );
    TestValidator.equals(
      "reply summary author id should match member id",
      summary.author.id,
      member.id,
    );
  }

  // Ensure created_at is ascending within first page
  if (firstData.length === 2) {
    const firstCreated = firstData[0].created_at;
    const secondCreated = firstData[1].created_at;
    TestValidator.predicate(
      "first page replies should be ordered by created_at ascending",
      new Date(firstCreated).getTime() <= new Date(secondCreated).getTime(),
    );
  }

  // 8. List replies - second page (page=2, limit=2)
  const secondPageRequestBody = {
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 2 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    cursor: undefined,
    sortBy: "createdAtAsc" as const,
    includeModerated: undefined,
    includeRemoved: undefined,
  } satisfies ICommunityPlatformCommentReply.IRequest;

  const secondPage: IPageICommunityPlatformCommentReply.ISummary =
    await api.functional.communityPlatform.memberUser.posts.comments.replies.index(
      connection,
      {
        postId: post.id as string & tags.Format<"uuid">,
        commentId: parentComment.id as string & tags.Format<"uuid">,
        body: secondPageRequestBody,
      },
    );
  typia.assert(secondPage);

  const secondPagination = secondPage.pagination;
  const secondData = secondPage.data;

  TestValidator.equals(
    "second page current should be 2",
    secondPagination.current,
    2,
  );
  TestValidator.equals(
    "second page data length should be 1",
    secondData.length,
    1,
  );

  if (secondData.length === 1) {
    const lastSummary = secondData[0];
    TestValidator.equals(
      "second page reply post_id should match post.id",
      lastSummary.post_id,
      post.id,
    );
    TestValidator.equals(
      "second page reply parent_comment_id should match parentComment.id",
      lastSummary.parent_comment_id,
      parentComment.id,
    );
    TestValidator.equals(
      "second page reply author id should match member id",
      lastSummary.author.id,
      member.id,
    );

    if (firstData.length > 0) {
      const lastFirstPageCreated = firstData[firstData.length - 1].created_at;
      TestValidator.predicate(
        "second page reply should have created_at >= last first page reply",
        new Date(lastSummary.created_at).getTime() >=
          new Date(lastFirstPageCreated).getTime(),
      );
    }
  }
}
