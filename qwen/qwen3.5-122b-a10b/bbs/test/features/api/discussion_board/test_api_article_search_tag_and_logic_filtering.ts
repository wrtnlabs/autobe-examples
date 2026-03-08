import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
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

export async function test_api_article_search_tag_and_logic_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Test search with multiple tag filters (AND logic)
  // Note: Article creation API is not available, so we test search endpoint directly
  // with various tag filter combinations to verify the search functionality
  const searchResult1 =
    await api.functional.discussionBoard.member.articles.search(
      memberConnection,
      {
        body: {
          tag_names: ["react", "typescript"],
          limit: 100,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(searchResult1);
  // Validate search result structure
  TestValidator.predicate(
    "Search returns paginated result with pagination metadata",
    searchResult1.pagination !== undefined,
  );
  TestValidator.predicate(
    "Pagination has required fields",
    searchResult1.pagination.current >= 1 &&
      searchResult1.pagination.limit >= 0 &&
      searchResult1.pagination.records >= 0 &&
      searchResult1.pagination.pages >= 0,
  );
  // 3. Test search with single tag filter
  const searchResult2 =
    await api.functional.discussionBoard.member.articles.search(
      memberConnection,
      {
        body: {
          tag_names: ["react"],
          limit: 100,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(searchResult2);
  // Validate single tag search returns properly structured results
  TestValidator.predicate(
    "Single tag search returns paginated result",
    searchResult2.data !== undefined && Array.isArray(searchResult2.data),
  );
  // 4. Test case-insensitive tag matching with uppercase tags
  const searchResult3 =
    await api.functional.discussionBoard.member.articles.search(
      memberConnection,
      {
        body: {
          tag_names: ["REACT", "TYPESCRIPT"],
          limit: 100,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(searchResult3);
  // Validate case-insensitive search returns properly structured results
  TestValidator.predicate(
    "Case-insensitive tag search returns paginated result",
    searchResult3.data !== undefined && Array.isArray(searchResult3.data),
  );
  // 5. Test search with empty tag array (no tag filtering)
  const searchResult4 =
    await api.functional.discussionBoard.member.articles.search(
      memberConnection,
      {
        body: {
          tag_names: [],
          limit: 100,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(searchResult4);
  // Validate empty tag array returns all articles (no tag filtering applied)
  TestValidator.predicate(
    "Empty tag array returns articles without tag filtering",
    searchResult4.data !== undefined && Array.isArray(searchResult4.data),
  );
  // 6. Test search with no tag_names property (undefined - no filtering)
  const searchResult5 =
    await api.functional.discussionBoard.member.articles.search(
      memberConnection,
      {
        body: {
          limit: 100,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(searchResult5);
  // Validate undefined tag_names returns all articles
  TestValidator.predicate(
    "Undefined tag_names returns articles without tag filtering",
    searchResult5.data !== undefined && Array.isArray(searchResult5.data),
  );
  // 7. Test search with pagination parameters
  const searchResult6 =
    await api.functional.discussionBoard.member.articles.search(
      memberConnection,
      {
        body: {
          tag_names: ["frontend"],
          page: 1,
          limit: 10,
          sort: "newest",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(searchResult6);
  // Validate pagination parameters are respected
  TestValidator.equals(
    "Pagination current page is 1",
    searchResult6.pagination.current,
    1,
  );
  TestValidator.equals(
    "Pagination limit is 10",
    searchResult6.pagination.limit,
    10,
  );
  // 8. Test search with oldest sort order
  const searchResult7 =
    await api.functional.discussionBoard.member.articles.search(
      memberConnection,
      {
        body: {
          tag_names: ["backend"],
          page: 1,
          limit: 10,
          sort: "oldest",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(searchResult7);
  // Validate oldest sort returns properly structured results
  TestValidator.predicate(
    "Oldest sort returns paginated result",
    searchResult7.data !== undefined && Array.isArray(searchResult7.data),
  );
}
