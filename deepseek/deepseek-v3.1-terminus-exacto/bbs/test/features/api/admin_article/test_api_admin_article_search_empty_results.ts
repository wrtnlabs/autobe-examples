import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
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
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_admin_article_search_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate regular user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create admin connection and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123456",
      display_name: "Test Admin",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create test sections using utility function
  const section1 = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: "Politics",
        description: "Political discussions",
        display_order: 1,
      } satisfies Partial<IDiscussionBoardSection.ICreate>,
    },
  );
  typia.assert(section1);
  const section2 = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: "Economy",
        description: "Economic discussions",
        display_order: 2,
      } satisfies Partial<IDiscussionBoardSection.ICreate>,
    },
  );
  typia.assert(section2);
  // Create test articles using utility function
  const article1 = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: "Current economic trends and analysis",
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: section1.id,
        status: "published",
      } satisfies Partial<IDiscussionBoardArticle.ICreate>,
    },
  );
  typia.assert(article1);
  const article2 = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: "Latest political developments",
        content: RandomGenerator.content({ paragraphs: 2 }),
        section_id: section2.id,
        status: "published",
      } satisfies Partial<IDiscussionBoardArticle.ICreate>,
    },
  );
  typia.assert(article2);
  // Test 1: Search for non-existent keyword
  const searchNonExistent =
    await api.functional.discussionBoard.admin.articles.index(adminConnection, {
      body: {
        search: "nonexistentkeywordxyz123",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchNonExistent);
  TestValidator.equals(
    "empty results for non-existent keyword",
    searchNonExistent.data.length,
    0,
  );
  TestValidator.equals(
    "zero pagination records",
    searchNonExistent.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pagination pages",
    searchNonExistent.pagination.pages,
    0,
  );
  // Test 2: Filter by non-existent section
  const nonExistentSectionId = typia.random<string & tags.Format<"uuid">>();
  const searchWrongSection =
    await api.functional.discussionBoard.admin.articles.index(adminConnection, {
      body: {
        section_id: nonExistentSectionId,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchWrongSection);
  TestValidator.equals(
    "empty results for non-existent section",
    searchWrongSection.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for non-existent section",
    searchWrongSection.pagination.records,
    0,
  );
  // Test 3: Filter by non-existent author
  const nonExistentAuthorId = typia.random<string & tags.Format<"uuid">>();
  const searchWrongAuthor =
    await api.functional.discussionBoard.admin.articles.index(adminConnection, {
      body: {
        author_id: nonExistentAuthorId,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchWrongAuthor);
  TestValidator.equals(
    "empty results for non-existent author",
    searchWrongAuthor.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for non-existent author",
    searchWrongAuthor.pagination.records,
    0,
  );
  // Test 4: Filter by draft status when all articles are published
  const searchDraftStatus =
    await api.functional.discussionBoard.admin.articles.index(adminConnection, {
      body: {
        status: "draft",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchDraftStatus);
  TestValidator.equals(
    "empty results for draft status",
    searchDraftStatus.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for draft status",
    searchDraftStatus.pagination.records,
    0,
  );
  // Test 5: Combined multiple restrictive filters
  const combinedSearch =
    await api.functional.discussionBoard.admin.articles.index(adminConnection, {
      body: {
        search: "nonexistentkeywordxyz123",
        section_id: nonExistentSectionId,
        author_id: nonExistentAuthorId,
        status: "draft",
        created_after: new Date().toISOString(),
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(combinedSearch);
  TestValidator.equals(
    "empty results for combined restrictive filters",
    combinedSearch.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for combined filters",
    combinedSearch.pagination.records,
    0,
  );
  // Test 6: Future date filter
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 1);
  const searchFutureDate =
    await api.functional.discussionBoard.admin.articles.index(adminConnection, {
      body: {
        created_after: futureDate.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchFutureDate);
  TestValidator.equals(
    "empty results for future date filter",
    searchFutureDate.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for future date",
    searchFutureDate.pagination.records,
    0,
  );
}
