import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";

/**
 * Validate comment search pagination and createdAt-based sorting.
 *
 * Business flow:
 *
 * 1. Register a member user (join) and obtain an authenticated member context.
 * 2. Create a community under that member.
 * 3. Create a membership for the community so the member can post and comment.
 * 4. Create a single post in that community.
 * 5. Create multiple comments (e.g., 20) on that post.
 * 6. Search comments via PATCH /communityPlatform/search/comments with postId
 *    filter.
 * 7. Verify page/limit metadata and that createdAt sorting works in both DESC and
 *    ASC.
 */
export async function test_api_search_comments_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register member user
  const memberJoinInput = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinInput,
    });
  typia.assert(member);

  // 2. Create community
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(10),
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
  typia.assert(community);

  // 3. Create membership for the same user in that community
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
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 5. Create multiple comments (20) on the post
  const totalComments = 20;
  const createdComments: ICommunityPlatformComment[] = [];

  for (let i = 0; i < totalComments; i++) {
    const commentBody = {
      content: RandomGenerator.paragraph({ sentences: 3 }),
      parentCommentId: undefined,
    } satisfies ICommunityPlatformComment.ICreate;

    const comment =
      await api.functional.communityPlatform.memberUser.posts.comments.create(
        connection,
        {
          postId: post.id as string & tags.Format<"uuid">,
          body: commentBody,
        },
      );
    typia.assert(comment);
    createdComments.push(comment);
  }

  // Helper to assert descending order by createdAt
  const assertDescendingByCreatedAt = (
    list: ICommunityPlatformComment.ISummary[],
    titlePrefix: string,
  ) => {
    for (let i = 1; i < list.length; i++) {
      const prev = new Date(list[i - 1].createdAt).getTime();
      const curr = new Date(list[i].createdAt).getTime();
      TestValidator.predicate(
        `${titlePrefix} - createdAt[${i - 1}] >= createdAt[${i}]`,
        prev >= curr,
      );
    }
  };

  // Helper to assert ascending order by createdAt
  const assertAscendingByCreatedAt = (
    list: ICommunityPlatformComment.ISummary[],
    titlePrefix: string,
  ) => {
    for (let i = 1; i < list.length; i++) {
      const prev = new Date(list[i - 1].createdAt).getTime();
      const curr = new Date(list[i].createdAt).getTime();
      TestValidator.predicate(
        `${titlePrefix} - createdAt[${i - 1}] <= createdAt[${i}]`,
        prev <= curr,
      );
    }
  };

  // 6. Search comments page 1, createdAtDesc
  const limit = 5;

  const page1: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.search.comments.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: limit as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        cursor: undefined,
        orderBy: "createdAtDesc",
        authorMemberUserId: undefined,
        communityId: undefined,
        postId: post.id as string & tags.Format<"uuid">,
        parentCommentId: undefined,
        createdFrom: undefined,
        createdTo: undefined,
        query: undefined,
        includeRemoved: undefined,
        includeHiddenByScore: undefined,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(page1);

  const pagination1 = page1.pagination;
  const data1 = page1.data;

  TestValidator.equals(
    "page1.limit should equal requested limit",
    pagination1.limit,
    limit,
  );
  TestValidator.equals("page1.current should be 1", pagination1.current, 1);
  TestValidator.predicate(
    "page1.records should be at least total created comments",
    pagination1.records >= totalComments,
  );

  const expectedPages = Math.ceil(
    pagination1.records / Math.max(pagination1.limit, 1),
  );
  TestValidator.equals(
    "page1.pages should equal ceil(records/limit)",
    pagination1.pages,
    expectedPages,
  );

  TestValidator.equals(
    "page1.data length should equal limit",
    data1.length,
    limit,
  );

  // ensure all comments belong to the same post
  for (const summary of data1) {
    TestValidator.equals(
      "page1 summaries should be for the target post",
      summary.post.id,
      post.id,
    );
  }

  // Verify descending order by createdAt on page 1
  assertDescendingByCreatedAt(data1, "page1 createdAtDesc");

  // 7. Search comments page 2, createdAtDesc
  const page2: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.search.comments.index(connection, {
      body: {
        page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: limit as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        cursor: undefined,
        orderBy: "createdAtDesc",
        authorMemberUserId: undefined,
        communityId: undefined,
        postId: post.id as string & tags.Format<"uuid">,
        parentCommentId: undefined,
        createdFrom: undefined,
        createdTo: undefined,
        query: undefined,
        includeRemoved: undefined,
        includeHiddenByScore: undefined,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(page2);

  const pagination2 = page2.pagination;
  const data2 = page2.data;

  TestValidator.equals(
    "page2.limit should equal requested limit",
    pagination2.limit,
    limit,
  );
  TestValidator.equals("page2.current should be 2", pagination2.current, 2);
  TestValidator.equals(
    "page2.pages should match page1.pages",
    pagination2.pages,
    pagination1.pages,
  );

  TestValidator.equals(
    "page2.data length should equal limit",
    data2.length,
    limit,
  );

  for (const summary of data2) {
    TestValidator.equals(
      "page2 summaries should be for the target post",
      summary.post.id,
      post.id,
    );
  }

  assertDescendingByCreatedAt(data2, "page2 createdAtDesc");

  // Ensure no overlap of IDs between page1 and page2 and combined ordering
  const ids1 = data1.map((c) => c.id);
  const ids2 = data2.map((c) => c.id);

  for (const id of ids1) {
    TestValidator.predicate(
      "no duplicate comment IDs between page1 and page2",
      ids2.indexOf(id) === -1,
    );
  }

  const combinedDesc = [...data1, ...data2];
  assertDescendingByCreatedAt(
    combinedDesc,
    "combined page1+page2 createdAtDesc",
  );

  // 8. Search comments page 1, createdAtAsc
  const pageAsc: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.search.comments.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: limit as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        cursor: undefined,
        orderBy: "createdAtAsc",
        authorMemberUserId: undefined,
        communityId: undefined,
        postId: post.id as string & tags.Format<"uuid">,
        parentCommentId: undefined,
        createdFrom: undefined,
        createdTo: undefined,
        query: undefined,
        includeRemoved: undefined,
        includeHiddenByScore: undefined,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(pageAsc);

  const dataAsc = pageAsc.data;

  TestValidator.equals(
    "pageAsc.data length should equal limit",
    dataAsc.length,
    limit,
  );

  for (const summary of dataAsc) {
    TestValidator.equals(
      "pageAsc summaries should be for the target post",
      summary.post.id,
      post.id,
    );
  }

  assertAscendingByCreatedAt(dataAsc, "page1 createdAtAsc");
}
