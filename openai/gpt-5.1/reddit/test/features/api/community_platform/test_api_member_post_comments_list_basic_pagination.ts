import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";

/**
 * Validate basic page-based pagination for memberUser post comments index.
 *
 * Business flow:
 *
 * 1. Register a new memberUser via auth.memberUser.join, establishing an
 *    authenticated context.
 * 2. Create a community via communityPlatform.memberUser.communities.create.
 * 3. Create a post within that community via
 *    communityPlatform.memberUser.posts.create.
 * 4. Seed multiple comments (>=3) on that post via
 *    communityPlatform.memberUser.posts.comments.create.
 * 5. Call PATCH /communityPlatform/memberUser/posts/{postId}/comments (index) with
 *    ICommunityPlatformComment.IRequest using page-based pagination (page,
 *    limit).
 * 6. Fetch page 1 and page 2, then verify pagination metadata and page contents.
 */
export async function test_api_member_post_comments_list_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Register member user (authentication context)
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

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

  // 3. Create a post in the community
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 8,
      wordMin: 3,
      wordMax: 10,
    }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 4. Seed multiple comments on the post (create 3 comments)
  const commentCount = 3;
  const createdComments: ICommunityPlatformComment[] = [];

  for (let i = 0; i < commentCount; i++) {
    const createCommentBody = {
      content: RandomGenerator.paragraph({ sentences: 4 }),
      parentCommentId: undefined,
    } satisfies ICommunityPlatformComment.ICreate;

    const comment: ICommunityPlatformComment =
      await api.functional.communityPlatform.memberUser.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: createCommentBody,
        },
      );
    typia.assert(comment);
    createdComments.push(comment);
  }

  const createdCommentIds: string[] = createdComments.map((c) => c.id);

  // 5. Fetch first page of comments with limit = 2
  const limitPerPage = 2;
  const requestPage1 = {
    page: 1,
    limit: limitPerPage,
  } satisfies ICommunityPlatformComment.IRequest;

  const page1: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.memberUser.posts.comments.index(
      connection,
      {
        postId: post.id,
        body: requestPage1,
      },
    );
  typia.assert(page1);

  const pagination1 = page1.pagination;
  typia.assert<IPage.IPagination>(pagination1);

  TestValidator.equals(
    "pagination current page should be 1",
    pagination1.current,
    1,
  );
  TestValidator.equals(
    "pagination limit equals requested limit (page1)",
    pagination1.limit,
    limitPerPage,
  );
  TestValidator.equals(
    "pagination records equals number of created comments (page1)",
    pagination1.records,
    commentCount,
  );

  const expectedPages = Math.ceil(commentCount / limitPerPage);
  TestValidator.equals(
    "pagination pages equals ceil(records/limit) (page1)",
    pagination1.pages,
    expectedPages,
  );

  TestValidator.predicate(
    "page1 data length should be > 0 and <= limit",
    page1.data.length > 0 && page1.data.length <= limitPerPage,
  );

  for (const summary of page1.data) {
    typia.assert<ICommunityPlatformComment.ISummary>(summary);

    TestValidator.equals(
      "page1 comment summary post id should match created post",
      summary.post.id,
      post.id,
    );
    TestValidator.equals(
      "page1 comment summary author id should match joined member",
      summary.author.id,
      authorized.id,
    );
  }

  // 6. Fetch second page of comments with same limit
  const requestPage2 = {
    page: 2,
    limit: limitPerPage,
  } satisfies ICommunityPlatformComment.IRequest;

  const page2: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.memberUser.posts.comments.index(
      connection,
      {
        postId: post.id,
        body: requestPage2,
      },
    );
  typia.assert(page2);

  const pagination2 = page2.pagination;
  typia.assert<IPage.IPagination>(pagination2);

  TestValidator.equals(
    "pagination current page should be 2",
    pagination2.current,
    2,
  );
  TestValidator.equals(
    "pagination limit equals requested limit (page2)",
    pagination2.limit,
    limitPerPage,
  );
  TestValidator.equals(
    "pagination records equals number of created comments (page2)",
    pagination2.records,
    commentCount,
  );
  TestValidator.equals(
    "pagination pages equals expected pages (page2)",
    pagination2.pages,
    expectedPages,
  );

  TestValidator.predicate(
    "page2 data length should be >= 0 and <= limit",
    page2.data.length >= 0 && page2.data.length <= limitPerPage,
  );

  for (const summary of page2.data) {
    typia.assert<ICommunityPlatformComment.ISummary>(summary);

    TestValidator.equals(
      "page2 comment summary post id should match created post",
      summary.post.id,
      post.id,
    );
    TestValidator.equals(
      "page2 comment summary author id should match joined member",
      summary.author.id,
      authorized.id,
    );
  }

  // 7. Verify that combined page1 + page2 IDs match created comment IDs and are unique
  const page1Ids = page1.data.map((c) => c.id);
  const page2Ids = page2.data.map((c) => c.id);
  const combinedIds = [...page1Ids, ...page2Ids];

  const uniqueCombinedIds = Array.from(new Set(combinedIds));
  TestValidator.equals(
    "combined page ids should have no duplicates",
    uniqueCombinedIds.length,
    combinedIds.length,
  );

  TestValidator.equals(
    "total number of comments returned across pages should equal created count",
    combinedIds.length,
    commentCount,
  );

  const missingInCombined = createdCommentIds.filter(
    (id) => !combinedIds.includes(id),
  );

  TestValidator.equals(
    "combined page ids should cover all created comments",
    missingInCombined.length,
    0,
  );
}
