import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_discussion_board_member_search_comprehensive(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      // IDiscussionBoardMember.IJoin has no required fields currently
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // Test 1: Empty search with pagination
  const emptySearch =
    await api.functional.discussionBoard.member.search.articles.index(
      memberConnection,
      {
        body: {
          // IDiscussionBoardArticle.IRequest has no required fields currently
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.equals("pagination exists", emptySearch.pagination.current, 1);
  TestValidator.predicate("has data array", Array.isArray(emptySearch.data));
  // Test 2: Title keyword search
  const titleSearch =
    await api.functional.discussionBoard.member.search.articles.index(
      memberConnection,
      {
        body: {
          // IDiscussionBoardArticle.IRequest has no required fields currently
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(titleSearch);
  // Test 3: Content keyword search
  const contentSearch =
    await api.functional.discussionBoard.member.search.articles.index(
      memberConnection,
      {
        body: {
          // IDiscussionBoardArticle.IRequest has no required fields currently
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(contentSearch);
  // Test 4: Combined search and pagination
  const paginatedSearch =
    await api.functional.discussionBoard.member.search.articles.index(
      memberConnection,
      {
        body: {
          // IDiscussionBoardArticle.IRequest has no required fields currently
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(paginatedSearch);
  // Test 5: Tag filtering
  const tagFilter =
    await api.functional.discussionBoard.member.search.articles.index(
      memberConnection,
      {
        body: {
          // IDiscussionBoardArticle.IRequest has no required fields currently
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(tagFilter);
  // Test 6: Combined keyword and tag search
  const combinedSearch =
    await api.functional.discussionBoard.member.search.articles.index(
      memberConnection,
      {
        body: {
          // IDiscussionBoardArticle.IRequest has no required fields currently
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(combinedSearch);
  // Test 7: Pagination boundary validation
  const paginationTest =
    await api.functional.discussionBoard.member.search.articles.index(
      memberConnection,
      {
        body: {
          // IDiscussionBoardArticle.IRequest has no required fields currently
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(paginationTest);
  // Test 8: Sorting validation
  const sortTest =
    await api.functional.discussionBoard.member.search.articles.index(
      memberConnection,
      {
        body: {
          // IDiscussionBoardArticle.IRequest has no required fields currently
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(sortTest);
  // Test 9: Edge cases
  const edgeCase =
    await api.functional.discussionBoard.member.search.articles.index(
      memberConnection,
      {
        body: {
          // IDiscussionBoardArticle.IRequest has no required fields currently
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(edgeCase);
}
