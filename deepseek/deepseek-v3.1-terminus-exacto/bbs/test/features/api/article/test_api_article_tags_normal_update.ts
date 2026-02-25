import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_tags_normal_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Step 2: Create test article
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Step 3: Update article tags with various test cases
  const testTags = [
    "TECHNOLOGY", // Should be normalized to lowercase
    "  programming  ", // Whitespace should be trimmed
    "javascript", // Normal case
    "Web Development", // Space preservation within tags
    "ai", // Short tag
  ];
  const tagResponse =
    await api.functional.discussionBoard.user.articles.tags.index(
      userConnection,
      {
        articleId: article.id,
        body: {
          tags: testTags satisfies (string &
            tags.MinLength<1> &
            tags.MaxLength<50>)[],
        } satisfies IDiscussionBoardArticleTag.IRequest,
      },
    );
  typia.assert(tagResponse);
  // Step 4: Validate tag normalization and business logic
  const expectedNormalizedTags = [
    "technology",
    "programming",
    "javascript",
    "web development",
    "ai",
  ];
  const returnedTagNames = tagResponse.data.map((tag) => tag.tag_name);
  // Test that all returned tags are properly normalized (whitespace trimmed, lowercase)
  for (const tagName of returnedTagNames) {
    TestValidator.predicate(
      "tag name has no leading/trailing whitespace",
      tagName.trim() === tagName,
    );
    TestValidator.predicate(
      "tag name is lowercase",
      tagName === tagName.toLowerCase(),
    );
    TestValidator.predicate(
      "tag name length valid",
      tagName.length >= 1 && tagName.length <= 50,
    );
  }
  // Test that all expected tags are present (API may remove duplicates)
  for (const expectedTag of expectedNormalizedTags) {
    TestValidator.predicate(
      `normalized tag "${expectedTag}" should be present`,
      returnedTagNames.includes(expectedTag),
    );
  }
  // Test timestamp ordering if multiple tags are present
  if (tagResponse.data.length > 1) {
    const timestamps = tagResponse.data.map((tag) =>
      new Date(tag.created_at).getTime(),
    );
    TestValidator.predicate(
      "tags should have valid creation timestamps",
      timestamps.every((ts) => !isNaN(ts) && ts > 0),
    );
  }
}
