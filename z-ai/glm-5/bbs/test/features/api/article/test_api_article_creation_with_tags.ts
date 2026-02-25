import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_article_creation_with_tags(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a new user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // Step 2: Create a discussion board section
  const section = await generate_random_discussion_board_user_sections_create(
    userConnection,
    {
      body: {
        name: "Politics and Economics",
        description: "Discussion about political and economic topics",
      },
    },
  );
  typia.assert(section);
  // Step 3: Create first article with tags: ['politics', 'economics']
  const article1 = await api.functional.discussionBoard.user.articles.create(
    userConnection,
    {
      body: {
        title: "First Article on Politics",
        content:
          "This is a discussion about politics and economics in the modern world.",
        sectionId: section.id,
        tags: ["politics", "economics"],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article1);
  // Step 4: Create second article with tags: ['politics', 'current-affairs', 'MARKET-TRENDS']
  // 'politics' already exists (should be reused)
  // 'current-affairs' and 'MARKET-TRENDS' are new (should be created)
  const article2 = await api.functional.discussionBoard.user.articles.create(
    userConnection,
    {
      body: {
        title: "Second Article on Current Markets",
        content:
          "This is a discussion about current market trends and political affairs.",
        sectionId: section.id,
        tags: ["politics", "current-affairs", "MARKET-TRENDS"],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article2);
  // Step 5: Verify second article has exactly 3 tags
  TestValidator.equals("article has exactly 3 tags", article2.tags.length, 3);
  // Step 6: Verify all tags are normalized to lowercase
  TestValidator.equals(
    "first tag is current-affairs",
    article2.tags[0].value,
    "current-affairs",
  );
  TestValidator.equals(
    "second tag is market-trends",
    article2.tags[1].value,
    "market-trends",
  );
  TestValidator.equals(
    "third tag is politics",
    article2.tags[2].value,
    "politics",
  );
  // Step 7: Verify each tag has id and value properties
  TestValidator.predicate(
    "first tag has valid id",
    article2.tags[0].id.length === 36,
  );
  TestValidator.predicate(
    "second tag has valid id",
    article2.tags[1].id.length === 36,
  );
  TestValidator.predicate(
    "third tag has valid id",
    article2.tags[2].id.length === 36,
  );
  // Step 8: Verify tags are sorted alphabetically by value
  TestValidator.predicate(
    "tags are sorted alphabetically",
    article2.tags[0].value <= article2.tags[1].value &&
      article2.tags[1].value <= article2.tags[2].value,
  );
  // Step 9: Verify 'politics' tag has same ID in both articles (tag reuse)
  const politicsTag1 = article1.tags.find((t) => t.value === "politics");
  const politicsTag2 = article2.tags.find((t) => t.value === "politics");
  TestValidator.equals(
    "politics tag ID is reused",
    politicsTag1!.id,
    politicsTag2!.id,
  );
  // Step 10: Verify new tags have unique IDs
  const marketTrendsTag = article2.tags.find(
    (t) => t.value === "market-trends",
  );
  const currentAffairsTag = article2.tags.find(
    (t) => t.value === "current-affairs",
  );
  TestValidator.notEquals(
    "new tags have unique IDs",
    marketTrendsTag!.id,
    currentAffairsTag!.id,
  );
  TestValidator.notEquals(
    "new tag differs from reused tag",
    marketTrendsTag!.id,
    politicsTag2!.id,
  );
  // Step 11: Verify tags with hyphens are accepted
  TestValidator.predicate(
    "hyphenated tag accepted",
    currentAffairsTag!.value === "current-affairs",
  );
  TestValidator.predicate(
    "hyphenated tag accepted",
    marketTrendsTag!.value === "market-trends",
  );
}
