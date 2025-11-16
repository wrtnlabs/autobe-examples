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

export async function test_api_search_comments_by_post_and_keyword(
  connection: api.IConnection,
) {
  // 1. Register a new member user and obtain authenticated context
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(member);

  // 2. Create a community
  const communitySlug = RandomGenerator.alphaNumeric(12);
  const communityBody = {
    slug: communitySlug as string & tags.MinLength<1> & tags.MaxLength<128>,
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
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Create a community membership for the member user
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
  typia.assert<ICommunityPlatformCommunityMembership>(membership);

  // 4. Create a post within that community
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
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
      body: postBody,
    });
  typia.assert<ICommunityPlatformPost>(post);

  // 5. Create multiple comments under the main post, some with keyword, some without
  const keyword = "keyword";
  const commentsWithKeywordCount = 3;
  const commentsWithoutKeywordCount = 2;

  const commentsWithKeyword: ICommunityPlatformComment[] = [];
  const commentsWithoutKeyword: ICommunityPlatformComment[] = [];

  for (let i = 0; i < commentsWithKeywordCount; i++) {
    const commentBody = {
      content: `${RandomGenerator.paragraph({ sentences: 4 })} ${keyword} ${RandomGenerator.paragraph({ sentences: 2 })}`,
      parentCommentId: undefined,
    } satisfies ICommunityPlatformComment.ICreate;

    const created: ICommunityPlatformComment =
      await api.functional.communityPlatform.memberUser.posts.comments.create(
        connection,
        {
          postId: post.id as string & tags.Format<"uuid">,
          body: commentBody,
        },
      );
    typia.assert<ICommunityPlatformComment>(created);
    commentsWithKeyword.push(created);
  }

  for (let i = 0; i < commentsWithoutKeywordCount; i++) {
    const commentBody = {
      content: RandomGenerator.paragraph({ sentences: 5 }),
      parentCommentId: undefined,
    } satisfies ICommunityPlatformComment.ICreate;

    const created: ICommunityPlatformComment =
      await api.functional.communityPlatform.memberUser.posts.comments.create(
        connection,
        {
          postId: post.id as string & tags.Format<"uuid">,
          body: commentBody,
        },
      );
    typia.assert<ICommunityPlatformComment>(created);
    commentsWithoutKeyword.push(created);
  }

  // 6. Create another post and comments that also contain the keyword
  const otherPostBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const otherPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: otherPostBody,
    });
  typia.assert<ICommunityPlatformPost>(otherPost);

  const otherPostCommentsWithKeyword: ICommunityPlatformComment[] = [];
  for (let i = 0; i < 2; i++) {
    const commentBody = {
      content: `${RandomGenerator.paragraph({ sentences: 3 })} ${keyword}`,
      parentCommentId: undefined,
    } satisfies ICommunityPlatformComment.ICreate;

    const created: ICommunityPlatformComment =
      await api.functional.communityPlatform.memberUser.posts.comments.create(
        connection,
        {
          postId: otherPost.id as string & tags.Format<"uuid">,
          body: commentBody,
        },
      );
    typia.assert<ICommunityPlatformComment>(created);
    otherPostCommentsWithKeyword.push(created);
  }

  // 7. Call the comment search endpoint filtered by postId and keyword
  const limit = commentsWithKeywordCount;
  const searchRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: limit as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    cursor: undefined,
    orderBy: "createdAtAsc" as const,
    authorMemberUserId: undefined,
    communityId: undefined,
    postId: post.id as string & tags.Format<"uuid">,
    parentCommentId: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    query: keyword,
    includeRemoved: undefined,
    includeHiddenByScore: undefined,
  } satisfies ICommunityPlatformComment.IRequest;

  const pageResult: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.search.comments.index(connection, {
      body: searchRequestBody,
    });
  typia.assert<IPageICommunityPlatformComment.ISummary>(pageResult);

  const pagination = pageResult.pagination;
  typia.assert<IPage.IPagination>(pagination);

  const expectedRecords = commentsWithKeywordCount;
  const expectedPages = 1;

  TestValidator.equals(
    "pagination current page is 1",
    pagination.current,
    1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.equals(
    "pagination limit equals requested limit",
    pagination.limit,
    limit as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.equals(
    "pagination records equals number of keyword comments on main post",
    pagination.records,
    expectedRecords as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.equals(
    "pagination pages equals 1",
    pagination.pages,
    expectedPages as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  const summaries = pageResult.data;

  // 8. Assert each returned summary belongs to the main post and contains the keyword
  const mainPostKeywordCommentIds = new Set<string>(
    commentsWithKeyword.map((c) => c.id),
  );
  const mainPostNonKeywordCommentIds = new Set<string>(
    commentsWithoutKeyword.map((c) => c.id),
  );
  const otherPostCommentIds = new Set<string>(
    otherPostCommentsWithKeyword.map((c) => c.id),
  );

  TestValidator.equals(
    "returned records count matches expected",
    summaries.length,
    expectedRecords,
  );

  for (const summary of summaries) {
    typia.assert<ICommunityPlatformComment.ISummary>(summary);

    TestValidator.equals(
      "summary post id matches main post id",
      summary.post.id,
      post.id,
    );

    TestValidator.predicate(
      "contentPreview includes keyword",
      summary.contentPreview.includes(keyword),
    );

    TestValidator.predicate(
      "summary id is among created keyword comments on main post",
      mainPostKeywordCommentIds.has(summary.id),
    );

    TestValidator.predicate(
      "summary id is not among non-keyword comments on main post",
      !mainPostNonKeywordCommentIds.has(summary.id),
    );

    TestValidator.predicate(
      "summary id is not among comments on other post",
      !otherPostCommentIds.has(summary.id),
    );
  }

  // 9. Verify that all keyword comments on main post are represented in results
  const returnedIds = new Set<string>(summaries.map((s) => s.id));
  for (const c of commentsWithKeyword) {
    TestValidator.predicate(
      "all keyword comments on main post appear in search results",
      returnedIds.has(c.id),
    );
  }
}
