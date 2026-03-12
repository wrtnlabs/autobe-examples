import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_administrator_sections_create } from "../../../generate/generate_random_discussion_board_administrator_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_article_snapshots_filter_by_criteria(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - join and login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Member setup - join and login
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 3. Create a section using administrator
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {},
    );
  typia.assert(section);
  // 4. Create an article using member
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        section_id: section.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        tags: ["test", "filter"],
      },
    },
  );
  typia.assert(article);
  // 5. Test 1: Basic snapshot retrieval with no filters
  const allSnapshots =
    await api.functional.discussionBoard.articles.snapshots.index(
      memberConnection,
      {
        articleId: article.id,
        body: {},
      },
    );
  typia.assert(allSnapshots);
  TestValidator.predicate(
    "pagination metadata exists",
    allSnapshots.pagination.current >= 1,
  );
  // 6. Test 2: Date range filtering (from/to)
  const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const toDate = new Date().toISOString();
  const dateFilteredSnapshots =
    await api.functional.discussionBoard.articles.snapshots.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          from: fromDate,
          to: toDate,
        },
      },
    );
  typia.assert(dateFilteredSnapshots);
  TestValidator.predicate(
    "date filtered results have pagination",
    dateFilteredSnapshots.pagination.current >= 1,
  );
  // 7. Test 3: Text search filtering on snapshot titles
  const searchKeyword = RandomGenerator.alphabets(5);
  const searchFilteredSnapshots =
    await api.functional.discussionBoard.articles.snapshots.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          search: searchKeyword,
        },
      },
    );
  typia.assert(searchFilteredSnapshots);
  TestValidator.predicate(
    "search filtered results have pagination",
    searchFilteredSnapshots.pagination.current >= 1,
  );
  // 8. Test 4: Author ID filtering
  const authorFilteredSnapshots =
    await api.functional.discussionBoard.articles.snapshots.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          authorId: memberAuth.id,
        },
      },
    );
  typia.assert(authorFilteredSnapshots);
  TestValidator.predicate(
    "author filtered results have pagination",
    authorFilteredSnapshots.pagination.current >= 1,
  );
  // 9. Test 5: Pagination parameters (page, limit)
  const paginatedSnapshots =
    await api.functional.discussionBoard.articles.snapshots.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(paginatedSnapshots);
  TestValidator.equals(
    "page number matches request",
    paginatedSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit matches request",
    paginatedSnapshots.pagination.limit,
    10,
  );
  // 10. Test 6: Custom sorting
  const sortedSnapshots =
    await api.functional.discussionBoard.articles.snapshots.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          sort: "created_at asc",
        },
      },
    );
  typia.assert(sortedSnapshots);
  TestValidator.predicate(
    "sorted results have pagination",
    sortedSnapshots.pagination.current >= 1,
  );
  // 11. Test 7: Combined filters (date range + search + author)
  const combinedFilteredSnapshots =
    await api.functional.discussionBoard.articles.snapshots.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          from: fromDate,
          to: toDate,
          search: searchKeyword,
          authorId: memberAuth.id,
          page: 1,
          limit: 20,
          sort: "created_at desc",
        },
      },
    );
  typia.assert(combinedFilteredSnapshots);
  TestValidator.predicate(
    "combined filter results have pagination",
    combinedFilteredSnapshots.pagination.current >= 1,
  );
  TestValidator.equals(
    "combined filter page number",
    combinedFilteredSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined filter limit",
    combinedFilteredSnapshots.pagination.limit,
    20,
  );
  // 12. Test 8: Empty filter results validation
  const emptySearchKeyword = typia.random<string & tags.Format<"uuid">>();
  const emptyFilteredSnapshots =
    await api.functional.discussionBoard.articles.snapshots.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          search: emptySearchKeyword,
        },
      },
    );
  typia.assert(emptyFilteredSnapshots);
  TestValidator.predicate(
    "empty results have valid pagination",
    emptyFilteredSnapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "empty results data array exists",
    Array.isArray(emptyFilteredSnapshots.data),
  );
}
