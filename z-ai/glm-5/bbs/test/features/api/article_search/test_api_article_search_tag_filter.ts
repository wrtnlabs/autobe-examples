import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_sections_create } from "../../../generate/generate_random_discussion_board_user_sections_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test article search with tag filtering to validate OR logic.
 *
 * 1. Authenticate as a user
 * 2. Create a section
 * 3. Create three articles with different tag configurations:
 *    - Article A: tagged with 'politics'
 *    - Article B: tagged with 'economics'
 *    - Article C: tagged with both 'politics' and 'economics'
 * 4. Execute search with tag filter 'politics' - verify results include Article A and Article C (OR logic)
 * 5. Execute search with multiple tags 'politics,economics' - verify results include all three articles
 * 6. Confirm tag filtering correctly uses OR logic through junction table
 */
export async function test_api_article_search_tag_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  typia.assert(user);
  // 2. Create a section to organize test articles
  const section = await generate_random_discussion_board_user_sections_create(
    userConnection,
    {},
  );
  typia.assert(section);
  // 3. Create first article with 'politics' tag
  const articleA = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.name(),
        content: RandomGenerator.content({ paragraphs: 2 }),
        sectionId: section.id,
        tags: ["politics"],
      },
    },
  );
  typia.assert(articleA);
  // 4. Create second article with 'economics' tag
  const articleB = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.name(),
        content: RandomGenerator.content({ paragraphs: 2 }),
        sectionId: section.id,
        tags: ["economics"],
      },
    },
  );
  typia.assert(articleB);
  // 5. Create third article with both 'politics' and 'economics' tags
  const articleC = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.name(),
        content: RandomGenerator.content({ paragraphs: 2 }),
        sectionId: section.id,
        tags: ["politics", "economics"],
      },
    },
  );
  typia.assert(articleC);
  // 6. Execute search with single tag filter 'politics'
  const politicsResult = await api.functional.discussionBoard.articles.search(
    connection,
    {
      body: {
        sort: "newest",
        tags: "politics",
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(politicsResult);
  // 7. Verify results include Article A and Article C (OR logic - any article with 'politics' tag)
  const politicsIds = politicsResult.data.map((article) => article.id);
  TestValidator.predicate(
    "Article A (politics only) should be in results for tag 'politics'",
    politicsIds.includes(articleA.id),
  );
  TestValidator.predicate(
    "Article C (both tags) should be in results for tag 'politics'",
    politicsIds.includes(articleC.id),
  );
  TestValidator.predicate(
    "Article B (economics only) should NOT be in results for tag 'politics'",
    !politicsIds.includes(articleB.id),
  );
  // 8. Execute search with multiple tags 'politics,economics'
  const multiTagResult = await api.functional.discussionBoard.articles.search(
    connection,
    {
      body: {
        sort: "newest",
        tags: "politics,economics",
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(multiTagResult);
  // 9. Verify results include all three articles (OR logic with multiple tags)
  const multiTagIds = multiTagResult.data.map((article) => article.id);
  TestValidator.predicate(
    "Article A should be in results for tags 'politics,economics'",
    multiTagIds.includes(articleA.id),
  );
  TestValidator.predicate(
    "Article B should be in results for tags 'politics,economics'",
    multiTagIds.includes(articleB.id),
  );
  TestValidator.predicate(
    "Article C should be in results for tags 'politics,economics'",
    multiTagIds.includes(articleC.id),
  );
  // 10. Verify each result includes tags array with correct tag summaries
  for (const article of politicsResult.data) {
    TestValidator.predicate(
      "Each result should have tags array",
      Array.isArray(article.tags),
    );
  }
  const articleAInResults = politicsResult.data.find(
    (a) => a.id === articleA.id,
  );
  if (articleAInResults) {
    TestValidator.predicate(
      "Article A should have 'politics' tag in result",
      articleAInResults.tags.some((t) => t.value === "politics"),
    );
  }
  const articleCInResults = politicsResult.data.find(
    (a) => a.id === articleC.id,
  );
  if (articleCInResults) {
    TestValidator.predicate(
      "Article C should have 'politics' tag in result",
      articleCInResults.tags.some((t) => t.value === "politics"),
    );
    TestValidator.predicate(
      "Article C should have 'economics' tag in result",
      articleCInResults.tags.some((t) => t.value === "economics"),
    );
  }
}
