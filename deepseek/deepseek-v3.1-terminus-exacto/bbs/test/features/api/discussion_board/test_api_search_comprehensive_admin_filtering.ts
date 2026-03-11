import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_search_comprehensive_admin_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create member connection for article creation
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // Create test articles with varied content and tags
  const articles = await ArrayUtil.asyncRepeat(5, async (index) => {
    const article =
      await generate_random_discussion_board_member_articles_create(
        memberConnection,
        {
          body: {
            title: `Test Article ${index} ${RandomGenerator.alphabets(5)}`,
            body: `Content for article ${index} with unique text ${RandomGenerator.alphabets(10)}`,
            discussion_board_section_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    typia.assert(article);
    return article;
  });
  // Test 1: Text search matching titles and content
  const searchResults1 =
    await api.functional.discussionBoard.admin.search.index(adminConnection, {
      body: {
        search: "Test Article",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResults1);
  TestValidator.predicate(
    "text search returns articles",
    searchResults1.data.length > 0,
  );
  // Test 2: Section filtering
  const searchResults2 =
    await api.functional.discussionBoard.admin.search.index(adminConnection, {
      body: {
        discussion_board_section_id: articles[0].section.id,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResults2);
  TestValidator.predicate(
    "section filter returns articles",
    searchResults2.data.length > 0,
  );
  // Test 3: Pagination with limit
  const searchResults3 =
    await api.functional.discussionBoard.admin.search.index(adminConnection, {
      body: {
        page: 1,
        limit: 2,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResults3);
  TestValidator.equals(
    "pagination limit enforced",
    searchResults3.data.length,
    2,
  );
  // Test 4: Empty search results for non-existent term
  const searchResults4 =
    await api.functional.discussionBoard.admin.search.index(adminConnection, {
      body: {
        search: "NonexistentSearchTerm12345",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResults4);
  TestValidator.equals(
    "empty search results returned",
    searchResults4.data.length,
    0,
  );
  // Validate search result structure
  if (searchResults1.data.length > 0) {
    const firstResult = searchResults1.data[0];
    TestValidator.predicate("result has id", firstResult.id !== undefined);
    TestValidator.predicate(
      "result has title",
      firstResult.title !== undefined,
    );
    TestValidator.predicate(
      "result has author",
      firstResult.author !== undefined,
    );
    TestValidator.predicate(
      "result has section",
      firstResult.section !== undefined,
    );
    TestValidator.predicate(
      "result has tags array",
      Array.isArray(firstResult.tags),
    );
    TestValidator.predicate(
      "result has comments count",
      typeof firstResult.comments_count === "number",
    );
    TestValidator.predicate(
      "result has creation timestamp",
      firstResult.created_at !== undefined,
    );
  }
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination metadata exists",
    searchResults1.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page valid",
    searchResults1.pagination.current >= 0,
  );
  TestValidator.predicate("limit valid", searchResults1.pagination.limit >= 0);
  TestValidator.predicate(
    "records count valid",
    searchResults1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count valid",
    searchResults1.pagination.pages >= 0,
  );
  // Test pagination calculation
  if (
    searchResults1.pagination.records > 0 &&
    searchResults1.pagination.limit > 0
  ) {
    const expectedPages = Math.ceil(
      searchResults1.pagination.records / searchResults1.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation correct",
      searchResults1.pagination.pages,
      expectedPages,
    );
  }
}
