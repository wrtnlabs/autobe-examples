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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test admin article search with empty results.
 *
 * Validates that when searching for articles with keywords that don't match
 * any existing article's title or content, the system returns an empty data
 * array with correct pagination metadata (records=0, pages=0).
 *
 * Test flow:
 * 1. Create admin account and authenticate
 * 2. Create a section required for article creation
 * 3. Create member account and authenticate
 * 4. Create articles with specific content
 * 5. Search with keyword that doesn't match any article
 * 6. Verify empty results and pagination metadata
 */
export async function test_api_admin_article_search_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinResult = await authorize_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminJoinResult);
  // Create admin connection for authenticated operations
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoinResult.email,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // 2. Create a section required for article creation
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Create member account
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberJoinResult = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberJoinResult);
  // Create member connection for authenticated operations
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: memberJoinResult.email,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  // 4. Create articles with specific content
  const article1 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: "Introduction to TypeScript Programming",
          body: "TypeScript is a strongly typed programming language that builds on JavaScript.",
          discussion_board_section_id: section.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article1);
  const article2 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: "Advanced React Patterns",
          body: "React hooks provide a powerful way to manage state and side effects.",
          discussion_board_section_id: section.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article2);
  // 5. Search with keyword that doesn't match any article
  const uniqueKeyword = `ZZZ_NONEXISTENT_KEYWORD_${RandomGenerator.alphaNumeric(10)}`;
  const searchResult =
    await api.functional.discussionBoard.admin.articles.search(
      adminConnection,
      {
        body: {
          search: uniqueKeyword,
          page: 1,
          limit: 20,
          sort: "newest",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(searchResult);
  // 6. Verify empty results
  TestValidator.equals("data array is empty", searchResult.data.length, 0);
  TestValidator.equals(
    "records count is zero",
    searchResult.pagination.records,
    0,
  );
  TestValidator.equals("pages count is zero", searchResult.pagination.pages, 0);
  TestValidator.equals("current page is 1", searchResult.pagination.current, 1);
  TestValidator.equals("limit is preserved", searchResult.pagination.limit, 20);
}
