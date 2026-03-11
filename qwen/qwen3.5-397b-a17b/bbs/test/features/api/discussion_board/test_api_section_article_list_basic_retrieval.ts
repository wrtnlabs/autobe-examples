import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
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
 * Test basic article list retrieval from a specific section.
 *
 * This test validates the primary success path for retrieving articles from a section:
 * 1. Admin creates a test section
 * 2. Member creates multiple articles in that section
 * 3. Query section articles with default pagination
 * 4. Validate all articles belong to the section and pagination is correct
 */
export async function test_api_section_article_list_basic_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create section
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 2,
          wordMax: 4,
        }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 2. Member setup - create articles
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
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
  // 3. Create multiple articles in the test section
  const articleCount = 5;
  const articles: IDiscussionBoardArticle[] = [];
  for (let i = 0; i < articleCount; i++) {
    const article =
      await generate_random_discussion_board_member_articles_create(
        memberConnection,
        {
          body: {
            title: RandomGenerator.paragraph({
              sentences: 1,
              wordMin: 3,
              wordMax: 6,
            }),
            content: RandomGenerator.content({ paragraphs: 2 }),
            sectionId: section.id,
            tags: ArrayUtil.repeat(2, () => RandomGenerator.name(1)),
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    typia.assert(article);
    articles.push(article);
  }
  // 4. Create a second section with articles to verify isolation
  const otherSection =
    await generate_random_discussion_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 2,
            wordMax: 4,
          }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(otherSection);
  // Create an article in the other section
  const otherSectionArticle =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 6,
          }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          sectionId: otherSection.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(otherSectionArticle);
  // 5. Query articles from the test section with default pagination
  const result = await api.functional.discussionBoard.sections.articles.index(
    memberConnection,
    {
      sectionId: section.id,
      body: {
        page: 1,
        limit: 20,
        sort: "newest",
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(result);
  // 6. Validate pagination metadata
  TestValidator.equals("current page", result.pagination.current, 1);
  TestValidator.equals("limit", result.pagination.limit, 20);
  TestValidator.equals(
    "total records",
    result.pagination.records,
    articleCount,
  );
  TestValidator.equals("total pages", result.pagination.pages, 1);
  // 7. Validate all articles belong to the queried section
  TestValidator.equals("article count", result.data.length, articleCount);
  // Verify all returned articles have valid structure (typia.assert validates all fields)
  for (const articleSummary of result.data) {
    typia.assert(articleSummary);
  }
  // 8. Verify articles are sorted by newest first (allow equal timestamps)
  for (let i = 1; i < result.data.length; i++) {
    const prevDate = new Date(result.data[i - 1].created_at).getTime();
    const currDate = new Date(result.data[i].created_at).getTime();
    TestValidator.predicate(
      `articles sorted newest first (index ${i})`,
      prevDate >= currDate,
    );
  }
  // 9. Verify other section's article is not included in test section results
  const otherSectionResult =
    await api.functional.discussionBoard.sections.articles.index(
      memberConnection,
      {
        sectionId: otherSection.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(otherSectionResult);
  TestValidator.equals(
    "other section article count",
    otherSectionResult.data.length,
    1,
  );
  TestValidator.equals(
    "other section article id matches",
    otherSectionResult.data[0].id,
    otherSectionArticle.id,
  );
  // Confirm test section articles don't appear in other section results
  const crossSectionArticles = result.data.filter((article) =>
    otherSectionResult.data.some((other) => other.id === article.id),
  );
  TestValidator.equals(
    "no cross-section articles",
    crossSectionArticles.length,
    0,
  );
}
