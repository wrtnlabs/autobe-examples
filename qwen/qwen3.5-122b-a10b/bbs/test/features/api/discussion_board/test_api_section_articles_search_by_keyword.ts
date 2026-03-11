import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test searching articles by keyword within a specific section.
 * 1. Admin creates a discussion board section
 * 2. Member creates multiple articles with different titles and body content
 * 3. Search articles using a keyword that matches some articles but not others
 * 4. Validate that only matching articles are returned in the search results
 * 5. Verify pagination metadata is correct
 */
export async function test_api_section_articles_search_by_keyword(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create section
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: "Technology",
        description: "Technology and innovation articles",
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 2. Member setup - create articles with different content
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // Create articles - some will match the search keyword, some won't
  const keyword = "blockchain";
  const matchingArticle1 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: "Introduction to Blockchain Technology",
          body: "Blockchain is a distributed ledger technology that enables secure and transparent transactions without intermediaries.",
          discussion_board_section_id: section.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(matchingArticle1);
  const matchingArticle2 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: "Smart Contracts on Blockchain Networks",
          body: "Smart contracts are self-executing contracts with the terms directly written into code on blockchain platforms.",
          discussion_board_section_id: section.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(matchingArticle2);
  const nonMatchingArticle1 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: "Cloud Computing Trends",
          body: "Cloud computing continues to evolve with new services and infrastructure options for businesses.",
          discussion_board_section_id: section.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(nonMatchingArticle1);
  const nonMatchingArticle2 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: "Mobile App Development Best Practices",
          body: "Modern mobile app development requires attention to user experience, performance, and security considerations.",
          discussion_board_section_id: section.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(nonMatchingArticle2);
  // 3. Search articles by keyword
  const searchResults =
    await api.functional.discussionBoard.sections.articles.index(connection, {
      sectionId: section.id,
      body: {
        search: keyword,
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResults);
  // 4. Validate search results
  TestValidator.equals("matching article count", searchResults.data.length, 2);
  const matchingArticleIds = searchResults.data.map((article) => article.id);
  TestValidator.predicate(
    "matching article 1 found",
    matchingArticleIds.includes(matchingArticle1.id),
  );
  TestValidator.predicate(
    "matching article 2 found",
    matchingArticleIds.includes(matchingArticle2.id),
  );
  TestValidator.predicate(
    "non-matching article 1 excluded",
    !matchingArticleIds.includes(nonMatchingArticle1.id),
  );
  TestValidator.predicate(
    "non-matching article 2 excluded",
    !matchingArticleIds.includes(nonMatchingArticle2.id),
  );
  // 5. Validate pagination metadata
  TestValidator.equals("current page", searchResults.pagination.current, 1);
  TestValidator.equals("limit", searchResults.pagination.limit, 20);
  TestValidator.equals("total records", searchResults.pagination.records, 2);
  TestValidator.predicate("has pages", searchResults.pagination.pages >= 1);
}
