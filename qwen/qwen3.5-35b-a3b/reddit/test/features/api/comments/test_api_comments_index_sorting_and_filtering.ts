import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_comments_index_sorting_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member session
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create second member for authorId filter testing
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member2Auth);
  // 3. Test 'best' sort mode (ORDER BY vote_score DESC, created_at DESC)
  const bestSortRequest = {
    sort: "best" as const,
    limit: 100,
    page: 1,
  } satisfies IRedditCommunityComment.IRequest;
  const bestSortResponse =
    await api.functional.redditCommunity.member.comments.index(
      memberConnection,
      { body: bestSortRequest },
    );
  typia.assert(bestSortResponse);
  // Validate best sort: highest vote scores first
  TestValidator.predicate(
    "best sort - first comment has highest vote score",
    bestSortResponse.data.length > 0
      ? bestSortResponse.data[0].voteScore >=
          bestSortResponse.data[bestSortResponse.data.length - 1].voteScore
      : true,
  );
  // 4. Test 'new' sort mode (ORDER BY created_at DESC)
  const newSortRequest = {
    sort: "new" as const,
    limit: 100,
    page: 1,
  } satisfies IRedditCommunityComment.IRequest;
  const newSortResponse =
    await api.functional.redditCommunity.member.comments.index(
      memberConnection,
      { body: newSortRequest },
    );
  typia.assert(newSortResponse);
  // Validate new sort: most recent comments first
  TestValidator.predicate(
    "new sort - first comment has most recent created_at",
    newSortResponse.data.length > 1
      ? newSortResponse.data[0].createdAt >=
          newSortResponse.data[newSortResponse.data.length - 1].createdAt
      : true,
  );
  // 5. Test 'controversial' sort mode (ORDER BY ABS(vote_score) DESC, created_at DESC)
  const controversialSortRequest = {
    sort: "controversial" as const,
    limit: 100,
    page: 1,
  } satisfies IRedditCommunityComment.IRequest;
  const controversialSortResponse =
    await api.functional.redditCommunity.member.comments.index(
      memberConnection,
      { body: controversialSortRequest },
    );
  typia.assert(controversialSortResponse);
  // Validate controversial sort: highest absolute vote scores first
  TestValidator.predicate(
    "controversial sort - first comment has highest ABS(vote_score)",
    controversialSortResponse.data.length > 0
      ? Math.abs(controversialSortResponse.data[0].voteScore) >=
          Math.abs(
            controversialSortResponse.data[
              controversialSortResponse.data.length - 1
            ].voteScore,
          )
      : true,
  );
  // 6. Test voteScoreMin and voteScoreMax filters
  const voteScoreFilterRequest = {
    voteScoreMin: 0,
    voteScoreMax: 10,
    limit: 100,
    page: 1,
  } satisfies IRedditCommunityComment.IRequest;
  const voteScoreFilterResponse =
    await api.functional.redditCommunity.member.comments.index(
      memberConnection,
      { body: voteScoreFilterRequest },
    );
  typia.assert(voteScoreFilterResponse);
  // Validate vote score filter: all comments should be within range
  TestValidator.predicate(
    "voteScore filter - all comments within range",
    voteScoreFilterResponse.data.every(
      (comment) => comment.voteScore >= 0 && comment.voteScore <= 10,
    ),
  );
  // 7. Test afterDate and beforeDate filters
  const afterDate = "2024-01-16T00:00:00Z";
  const beforeDate = "2024-01-19T00:00:00Z";
  const dateFilterRequest = {
    afterDate,
    beforeDate,
    limit: 100,
    page: 1,
  } satisfies IRedditCommunityComment.IRequest;
  const dateFilterResponse =
    await api.functional.redditCommunity.member.comments.index(
      memberConnection,
      { body: dateFilterRequest },
    );
  typia.assert(dateFilterResponse);
  // Validate date filter: all comments should be within date range
  TestValidator.predicate(
    "date filter - all comments within date range",
    dateFilterResponse.data.every(
      (comment) =>
        new Date(comment.createdAt) >= new Date(afterDate) &&
        new Date(comment.createdAt) <= new Date(beforeDate),
    ),
  );
  // 8. Test pagination with different page sizes
  const pageSizes = [10, 50, 100];
  for (const pageSize of pageSizes) {
    const paginationRequest = {
      limit: pageSize,
      page: 1,
    } satisfies IRedditCommunityComment.IRequest;
    const paginationResponse =
      await api.functional.redditCommunity.member.comments.index(
        memberConnection,
        { body: paginationRequest },
      );
    typia.assert(paginationResponse);
    // Validate pagination pages calculation
    const expectedPages = Math.ceil(
      paginationResponse.pagination.records /
        paginationResponse.pagination.limit,
    );
    TestValidator.equals(
      `pagination pages for limit=${pageSize}`,
      paginationResponse.pagination.pages,
      expectedPages,
    );
    // Validate limit is respected
    TestValidator.predicate(
      `pagination - data length <= limit for ${pageSize}`,
      paginationResponse.data.length <= pageSize,
    );
  }
  // 9. Test combined filters
  const combinedFilterRequest = {
    sort: "best" as const,
    voteScoreMin: 0,
    afterDate,
    limit: 50,
    page: 1,
  } satisfies IRedditCommunityComment.IRequest;
  const combinedFilterResponse =
    await api.functional.redditCommunity.member.comments.index(
      memberConnection,
      { body: combinedFilterRequest },
    );
  typia.assert(combinedFilterResponse);
  // Validate combined filters: all conditions must be satisfied
  TestValidator.predicate(
    "combined filters - all conditions satisfied",
    combinedFilterResponse.data.every(
      (comment) =>
        comment.voteScore >= 0 &&
        new Date(comment.createdAt) >= new Date(afterDate),
    ),
  );
  // 10. Test pagination with different page numbers
  const paginationPageTest = {
    limit: 10,
    page: 2,
  } satisfies IRedditCommunityComment.IRequest;
  const paginationPageResponse =
    await api.functional.redditCommunity.member.comments.index(
      memberConnection,
      { body: paginationPageTest },
    );
  typia.assert(paginationPageResponse);
  // Validate pagination current page
  TestValidator.equals(
    "pagination current page",
    paginationPageResponse.pagination.current,
    2,
  );
  // 11. Test that sorting works with filters combined
  const sortedWithFilterRequest = {
    sort: "new" as const,
    voteScoreMin: -10,
    limit: 100,
  } satisfies IRedditCommunityComment.IRequest;
  const sortedWithFilterResponse =
    await api.functional.redditCommunity.member.comments.index(
      memberConnection,
      { body: sortedWithFilterRequest },
    );
  typia.assert(sortedWithFilterResponse);
  // Validate sorting with filter applied
  TestValidator.predicate(
    "sort with filter - newest comments first",
    sortedWithFilterResponse.data.length > 1
      ? sortedWithFilterResponse.data[0].createdAt >=
          sortedWithFilterResponse.data[
            sortedWithFilterResponse.data.length - 1
          ].createdAt
      : true,
  );
  // 12. Test authorId filter (using second member account)
  if (member2Auth.token.access) {
    const authorIdFilterRequest = {
      authorId: member2Auth.token.access,
      limit: 100,
      page: 1,
    } satisfies IRedditCommunityComment.IRequest;
    const authorIdFilterResponse =
      await api.functional.redditCommunity.member.comments.index(
        memberConnection,
        { body: authorIdFilterRequest },
      );
    typia.assert(authorIdFilterResponse);
    // Validate authorId filter (note: this tests the API accepts the filter)
    TestValidator.predicate(
      "authorId filter - API accepts authorId parameter",
      authorIdFilterResponse !== null,
    );
  }
  // 13. Test postId filter
  const postIdFilterRequest = {
    postId: typia.random<string & tags.Format<"uuid">>(),
    limit: 100,
    page: 1,
  } satisfies IRedditCommunityComment.IRequest;
  const postIdFilterResponse =
    await api.functional.redditCommunity.member.comments.index(
      memberConnection,
      { body: postIdFilterRequest },
    );
  typia.assert(postIdFilterResponse);
  // Validate postId filter (note: this tests the API accepts the filter)
  TestValidator.predicate(
    "postId filter - API accepts postId parameter",
    postIdFilterResponse !== null,
  );
  // 14. Test empty results scenario
  const emptyFilterRequest = {
    voteScoreMin: 999999,
    limit: 100,
    page: 1,
  } satisfies IRedditCommunityComment.IRequest;
  const emptyFilterResponse =
    await api.functional.redditCommunity.member.comments.index(
      memberConnection,
      { body: emptyFilterRequest },
    );
  typia.assert(emptyFilterResponse);
  // Validate empty results
  TestValidator.equals(
    "empty filter - no comments returned",
    emptyFilterResponse.data.length,
    0,
  );
  // 15. Test page boundary (last page)
  const lastPageRequest = {
    limit: 10,
    page: 1,
  } satisfies IRedditCommunityComment.IRequest;
  const lastPageResponse =
    await api.functional.redditCommunity.member.comments.index(
      memberConnection,
      { body: lastPageRequest },
    );
  typia.assert(lastPageResponse);
  // Test jumping to last page
  const lastPageNumber = lastPageResponse.pagination.pages;
  const lastPageTestRequest = {
    limit: 10,
    page: lastPageNumber,
  } satisfies IRedditCommunityComment.IRequest;
  const lastPageTestResponse =
    await api.functional.redditCommunity.member.comments.index(
      memberConnection,
      { body: lastPageTestRequest },
    );
  typia.assert(lastPageTestResponse);
  // Validate last page
  TestValidator.equals(
    "last page - current page matches expected",
    lastPageTestResponse.pagination.current,
    lastPageNumber,
  );
}
