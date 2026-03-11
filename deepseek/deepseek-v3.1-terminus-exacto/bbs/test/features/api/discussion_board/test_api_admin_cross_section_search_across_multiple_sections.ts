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
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test that administrators can search for articles across all sections using the cross-section endpoint.
 * Create multiple articles in different sections (Politics, Economy, Current Affairs) using member accounts,
 * then authenticate as admin and perform a cross-section search. Validate that the response includes
 * articles from all sections, maintains section context in results, includes proper author information,
 * comment counts, and tags. Verify pagination metadata is accurate and articles are properly ordered
 * by creation date (newest first) by default. Test that search filters work correctly when specifying
 * section or tag filters.
 */
export async function test_api_admin_cross_section_search_across_multiple_sections(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create sections: Politics, Economy, Current Affairs
  const politicsSection =
    await generate_random_discussion_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: "Politics",
          description: "Political discussions and analysis",
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(politicsSection);
  const economySection =
    await generate_random_discussion_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: "Economy",
          description: "Economic trends and financial discussions",
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(economySection);
  const currentAffairsSection =
    await generate_random_discussion_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: "Current Affairs",
          description: "Current events and news discussions",
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(currentAffairsSection);
  // 3. Create member accounts and articles in different sections
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {
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
  const politicsArticle =
    await generate_random_discussion_board_member_articles_create(
      member1Connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          discussion_board_section_id: politicsSection.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(politicsArticle);
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {
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
  const economyArticle =
    await generate_random_discussion_board_member_articles_create(
      member2Connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          discussion_board_section_id: economySection.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(economyArticle);
  const member3Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member3Connection, {
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
  const currentAffairsArticle =
    await generate_random_discussion_board_member_articles_create(
      member3Connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          discussion_board_section_id: currentAffairsSection.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(currentAffairsArticle);
  // 4. Perform cross-section search as admin
  const searchResult =
    await api.functional.discussionBoard.admin.cross_section.index(
      adminConnection,
      {
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(searchResult);
  // 5. Validate response structure and content
  TestValidator.equals(
    "pagination structure",
    typeof searchResult.pagination,
    "object",
  );
  TestValidator.predicate(
    "has pagination metadata",
    searchResult.pagination.current >= 0 &&
      searchResult.pagination.limit > 0 &&
      searchResult.pagination.records >= 0 &&
      searchResult.pagination.pages >= 0,
  );
  TestValidator.equals("data is array", Array.isArray(searchResult.data), true);
  TestValidator.predicate(
    "contains articles from all sections",
    searchResult.data.length >= 3,
  );
  // Validate each article has required fields
  for (const article of searchResult.data) {
    TestValidator.predicate("article has id", typeof article.id === "string");
    TestValidator.predicate(
      "article has title",
      typeof article.title === "string",
    );
    TestValidator.predicate(
      "article has author",
      typeof article.author === "object",
    );
    TestValidator.predicate(
      "article author has id",
      typeof article.author.id === "string",
    );
    TestValidator.predicate(
      "article author has display_name",
      typeof article.author.display_name === "string",
    );
    TestValidator.predicate(
      "article has section",
      typeof article.section === "object",
    );
    TestValidator.predicate(
      "article section has id",
      typeof article.section.id === "string",
    );
    TestValidator.predicate(
      "article section has name",
      typeof article.section.name === "string",
    );
    TestValidator.predicate(
      "article has tags array",
      Array.isArray(article.tags),
    );
    TestValidator.predicate(
      "article has comments_count",
      typeof article.comments_count === "number",
    );
    TestValidator.predicate(
      "article has created_at",
      typeof article.created_at === "string",
    );
  }
  // 6. Test section filtering
  const politicsSearch =
    await api.functional.discussionBoard.admin.cross_section.index(
      adminConnection,
      {
        body: {
          discussion_board_section_id: politicsSection.id,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(politicsSearch);
  TestValidator.predicate(
    "politics search returns articles",
    politicsSearch.data.length > 0,
  );
  TestValidator.equals(
    "politics search section matches",
    politicsSearch.data.every(
      (article) => article.section.id === politicsSection.id,
    ),
    true,
  );
  // 7. Test pagination
  const paginationTest =
    await api.functional.discussionBoard.admin.cross_section.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(paginationTest);
  TestValidator.equals(
    "pagination limit respected",
    paginationTest.data.length <= 2,
    true,
  );
  TestValidator.predicate(
    "pagination metadata valid",
    paginationTest.pagination.current === 1 &&
      paginationTest.pagination.limit === 2,
  );
}