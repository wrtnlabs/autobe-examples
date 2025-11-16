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
 * Validate comment listing with filters and sorting for a memberUser post.
 *
 * Business goal: Ensure that the scoped comments index endpoint for a post
 * correctly applies author filtering, date range filtering, and createdAt-based
 * sorting, and that it returns the expected pagination metadata and nested
 * post/author summaries.
 *
 * Steps:
 *
 * 1. Join as member A and obtain an authorized member session.
 * 2. As member A, create a community.
 * 3. As member A, create a post in that community.
 * 4. As member A, create multiple comments under the post.
 * 5. Join as member B on the same connection, creating additional comments on the
 *    same post.
 * 6. Re-join as member A to perform comment listing queries.
 * 7. Call the comments index endpoint without author or date filters to get a
 *    baseline ordered list of comments.
 * 8. Call the comments index endpoint with authorMemberUserId filter for member A
 *    and orderBy=createdAtAsc, asserting only A-authored comments are returned
 *    and ordering is ascending.
 * 9. Call the comments index endpoint with the same author filter but
 *    orderBy=createdAtDesc, asserting the same set is returned in exact reverse
 *    order.
 * 10. Construct a createdFrom/createdTo window from baseline comments and call the
 *     index endpoint with those filters, asserting that all returned comments
 *     fall within the interval.
 */
export async function test_api_member_post_comments_list_with_filters_and_sorting(
  connection: api.IConnection,
) {
  // 1. Join as member A
  const memberAJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberA);

  const memberAId: string & tags.Format<"uuid"> = memberA.id;

  // 2. Create a community as member A
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(16),
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

  // 3. Create a post in the community as member A
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 10 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  const postId: string & tags.Format<"uuid"> = post.id as string &
    tags.Format<"uuid">;

  // 4. Create multiple comments under the post as member A
  const memberACommentCount = 3;
  const memberAComments: ICommunityPlatformComment[] = [];

  for (let i = 0; i < memberACommentCount; i++) {
    const commentBody = {
      content: RandomGenerator.paragraph({ sentences: 2 }),
      parentCommentId: undefined,
    } satisfies ICommunityPlatformComment.ICreate;

    const comment: ICommunityPlatformComment =
      await api.functional.communityPlatform.memberUser.posts.comments.create(
        connection,
        {
          postId,
          body: commentBody,
        },
      );
    typia.assert(comment);
    memberAComments.push(comment);
  }

  // 5. Join as member B on the same connection
  const memberBJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/ads",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberB);

  const memberBId: string & tags.Format<"uuid"> = memberB.id;

  // 6. Create additional comments under the same post as member B
  const memberBCommentCount = 2;
  const memberBComments: ICommunityPlatformComment[] = [];

  for (let i = 0; i < memberBCommentCount; i++) {
    const commentBody = {
      content: RandomGenerator.paragraph({ sentences: 2 }),
      parentCommentId: undefined,
    } satisfies ICommunityPlatformComment.ICreate;

    const comment: ICommunityPlatformComment =
      await api.functional.communityPlatform.memberUser.posts.comments.create(
        connection,
        {
          postId,
          body: commentBody,
        },
      );
    typia.assert(comment);
    memberBComments.push(comment);
  }

  // 7. Re-join as member A to perform listing queries
  const memberARejoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberARejoin);

  // 8. Baseline fetch: all comments for the post, ascending by createdAt
  const baselineRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    cursor: undefined,
    orderBy: "createdAtAsc" as const,
    authorMemberUserId: undefined,
    communityId: undefined,
    postId: undefined,
    parentCommentId: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    query: undefined,
    includeRemoved: undefined,
    includeHiddenByScore: undefined,
  } satisfies ICommunityPlatformComment.IRequest;

  const baselinePage: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.memberUser.posts.comments.index(
      connection,
      {
        postId,
        body: baselineRequestBody,
      },
    );
  typia.assert(baselinePage);

  const baselineData = baselinePage.data;

  // Basic sanity checks on baseline
  TestValidator.predicate(
    "baseline should include at least all created comments",
    baselineData.length >= memberAComments.length + memberBComments.length,
  );

  // Verify all summaries belong to the expected post and community
  for (const summary of baselineData) {
    TestValidator.equals(
      "summary.post.id matches post.id",
      summary.post.id,
      post.id,
    );
    TestValidator.equals(
      "summary.post.community.id matches community.id",
      summary.post.community.id,
      community.id,
    );
  }

  // Verify ascending createdAt order in baseline
  for (let i = 1; i < baselineData.length; i++) {
    const prev = baselineData[i - 1].createdAt;
    const curr = baselineData[i].createdAt;
    TestValidator.predicate("baseline createdAt ascending order", prev <= curr);
  }

  // 9. Filter by authorMemberUserId = memberA, ascending order
  const authorAAscRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    cursor: undefined,
    orderBy: "createdAtAsc" as const,
    authorMemberUserId: memberAId,
    communityId: undefined,
    postId: undefined,
    parentCommentId: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    query: undefined,
    includeRemoved: undefined,
    includeHiddenByScore: undefined,
  } satisfies ICommunityPlatformComment.IRequest;

  const authorAAscPage: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.memberUser.posts.comments.index(
      connection,
      {
        postId,
        body: authorAAscRequestBody,
      },
    );
  typia.assert(authorAAscPage);

  const authorAAscData = authorAAscPage.data;

  // Ensure all authors are A and none are B
  for (const summary of authorAAscData) {
    TestValidator.equals(
      "author filter A: summary.author.id is memberAId",
      summary.author.id,
      memberAId,
    );
    TestValidator.notEquals(
      "author filter A: summary.author.id is not memberBId",
      summary.author.id,
      memberBId,
    );
  }

  // Asc ordering for author A subset
  for (let i = 1; i < authorAAscData.length; i++) {
    const prev = authorAAscData[i - 1].createdAt;
    const curr = authorAAscData[i].createdAt;
    TestValidator.predicate("author A asc createdAt ordering", prev <= curr);
  }

  // 10. Same author filter, descending order
  const authorADescRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    cursor: undefined,
    orderBy: "createdAtDesc" as const,
    authorMemberUserId: memberAId,
    communityId: undefined,
    postId: undefined,
    parentCommentId: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    query: undefined,
    includeRemoved: undefined,
    includeHiddenByScore: undefined,
  } satisfies ICommunityPlatformComment.IRequest;

  const authorADescPage: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.memberUser.posts.comments.index(
      connection,
      {
        postId,
        body: authorADescRequestBody,
      },
    );
  typia.assert(authorADescPage);

  const authorADescData = authorADescPage.data;

  // Same count between asc and desc for author A
  TestValidator.equals(
    "author A asc/desc counts equal",
    authorADescData.length,
    authorAAscData.length,
  );

  // Check descending order and reverse correspondence on createdAt values
  for (
    let i = 0;
    i < authorAAscData.length && i < authorADescData.length;
    i++
  ) {
    const ascCreatedAt = authorAAscData[i].createdAt;
    const descCreatedAt =
      authorADescData[authorADescData.length - 1 - i].createdAt;
    TestValidator.equals(
      "author A desc is reverse of asc by createdAt",
      descCreatedAt,
      ascCreatedAt,
    );
  }

  // 11. Date range filter based on baseline
  if (baselineData.length >= 2) {
    const fromIndex = 0;
    const toIndex = baselineData.length - 1;
    const createdFrom = baselineData[fromIndex].createdAt;
    const createdTo = baselineData[toIndex].createdAt;

    const dateRangeRequestBody = {
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 50 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
      cursor: undefined,
      orderBy: "createdAtAsc" as const,
      authorMemberUserId: undefined,
      communityId: undefined,
      postId: undefined,
      parentCommentId: undefined,
      createdFrom,
      createdTo,
      query: undefined,
      includeRemoved: undefined,
      includeHiddenByScore: undefined,
    } satisfies ICommunityPlatformComment.IRequest;

    const dateRangePage: IPageICommunityPlatformComment.ISummary =
      await api.functional.communityPlatform.memberUser.posts.comments.index(
        connection,
        {
          postId,
          body: dateRangeRequestBody,
        },
      );
    typia.assert(dateRangePage);

    const dateRangeData = dateRangePage.data;

    // All returned comments must fall within [createdFrom, createdTo]
    for (const summary of dateRangeData) {
      TestValidator.predicate(
        "date range filter: createdAt >= createdFrom",
        summary.createdAt >= createdFrom,
      );
      TestValidator.predicate(
        "date range filter: createdAt <= createdTo",
        summary.createdAt <= createdTo,
      );
    }

    // Pagination metadata consistency: current page should be 1
    TestValidator.equals(
      "date range pagination current page is 1",
      dateRangePage.pagination.current,
      1,
    );
  }
}
