import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleTag";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_articles_create } from "../../../generate/generate_random_discussion_board_admin_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_tags_admin_batch_tag_operations(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Create a test article
  const article = await generate_random_discussion_board_admin_articles_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Test 1: Add tags with duplicates and whitespace variations
  const initialTagsResponse =
    await api.functional.discussionBoard.admin.articles.tags.index(
      adminConnection,
      {
        articleId: article.id,
        body: {
          tags: ["tech", "  TECH  ", "programming", "tech", " development "],
        } satisfies IDiscussionBoardArticleTag.IRequest,
      },
    );
  typia.assert(initialTagsResponse);
  // Verify duplicates are removed and normalized
  const normalizedTags = initialTagsResponse.data.map((tag) =>
    tag.tag_name.toLowerCase().trim(),
  );
  const uniqueTags = [...new Set(normalizedTags)];
  TestValidator.equals(
    "duplicate tags removed",
    uniqueTags.length,
    normalizedTags.length,
  );
  TestValidator.equals("correct tag count", initialTagsResponse.data.length, 3);
  // Test 2: Replace all tags with new set
  const replacementTagsResponse =
    await api.functional.discussionBoard.admin.articles.tags.index(
      adminConnection,
      {
        articleId: article.id,
        body: {
          tags: ["news", "update", "announcement"],
        } satisfies IDiscussionBoardArticleTag.IRequest,
      },
    );
  typia.assert(replacementTagsResponse);
  TestValidator.equals(
    "replacement tag count",
    replacementTagsResponse.data.length,
    3,
  );
  TestValidator.predicate("tags completely replaced", () => {
    const currentTags = replacementTagsResponse.data.map((tag) => tag.tag_name);
    return (
      currentTags.includes("news") &&
      currentTags.includes("update") &&
      currentTags.includes("announcement") &&
      !currentTags.includes("tech") &&
      !currentTags.includes("programming")
    );
  });
  // Test 3: Clear all tags with empty array
  const clearTagsResponse =
    await api.functional.discussionBoard.admin.articles.tags.index(
      adminConnection,
      {
        articleId: article.id,
        body: {
          tags: [],
        } satisfies IDiscussionBoardArticleTag.IRequest,
      },
    );
  typia.assert(clearTagsResponse);
  TestValidator.equals("all tags cleared", clearTagsResponse.data.length, 0);
}
