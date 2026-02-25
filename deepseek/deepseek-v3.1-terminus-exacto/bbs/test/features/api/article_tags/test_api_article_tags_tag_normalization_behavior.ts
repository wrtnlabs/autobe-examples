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

export async function test_api_article_tags_tag_normalization_behavior(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create an article first
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 8,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Test 1: Tags with whitespace normalization
  const whitespaceTags = [
    "  TAG1  ",
    "TAG2\t",
    "\nTAG3\n",
    "T AG 4", // internal spaces shouldn't be removed
    "  tag5  ",
  ] satisfies (string & tags.MinLength<1> & tags.MaxLength<50>)[];
  const update1 = await api.functional.discussionBoard.user.articles.tags.index(
    userConnection,
    {
      articleId: article.id,
      body: {
        tags: whitespaceTags,
      } satisfies IDiscussionBoardArticleTag.IRequest,
    },
  );
  typia.assert(update1);
  // Verify whitespace trimmed and lowercase conversion
  const normalized1 = update1.data.map((tag) => tag.tag_name);
  TestValidator.equals(
    "whitespace tags should be trimmed and lowercase",
    normalized1.sort(),
    ["tag1", "tag2", "tag3", "t ag 4", "tag5"].sort(),
  );
  // Test 2: Mixed case and duplicate handling
  const mixedCaseTags = [
    "JavaScript",
    "JAVASCRIPT",
    "javascript",
    "TypeScript",
    "TYPESCRIPT",
    "typescript",
    "React",
  ] satisfies (string & tags.MinLength<1> & tags.MaxLength<50>)[];
  const update2 = await api.functional.discussionBoard.user.articles.tags.index(
    userConnection,
    {
      articleId: article.id,
      body: {
        tags: mixedCaseTags,
      } satisfies IDiscussionBoardArticleTag.IRequest,
    },
  );
  typia.assert(update2);
  // Verify duplicates removed and lowercase conversion
  const normalized2 = update2.data.map((tag) => tag.tag_name);
  TestValidator.equals(
    "mixed case duplicate tags should be deduplicated and lowercase",
    normalized2.sort(),
    ["javascript", "typescript", "react"].sort(),
  );
  // Test 3: Length boundary validation
  const minLengthTag = "a";
  const maxLengthTag = RandomGenerator.alphabets(50);
  const tooLongTag = RandomGenerator.alphabets(51);
  // Test minimum length (should succeed)
  const update3 = await api.functional.discussionBoard.user.articles.tags.index(
    userConnection,
    {
      articleId: article.id,
      body: {
        tags: [minLengthTag],
      } satisfies IDiscussionBoardArticleTag.IRequest,
    },
  );
  typia.assert(update3);
  // Verify single character tag accepted
  TestValidator.equals(
    "minimum length tag should be accepted",
    update3.data.length,
    1,
  );
  TestValidator.equals(
    "minimum length tag value",
    update3.data[0].tag_name,
    "a",
  );
  // Test maximum length (should succeed)
  const update4 = await api.functional.discussionBoard.user.articles.tags.index(
    userConnection,
    {
      articleId: article.id,
      body: {
        tags: [maxLengthTag],
      } satisfies IDiscussionBoardArticleTag.IRequest,
    },
  );
  typia.assert(update4);
  // Verify 50 character tag accepted
  TestValidator.equals(
    "maximum length tag should be accepted",
    update4.data.length,
    1,
  );
  TestValidator.equals(
    "maximum length tag value",
    update4.data[0].tag_name,
    maxLengthTag.toLowerCase(),
  );
  // Test too long tag (should fail with validation error)
  await TestValidator.error("too long tag should be rejected", async () => {
    await api.functional.discussionBoard.user.articles.tags.index(
      userConnection,
      {
        articleId: article.id,
        body: {
          tags: [tooLongTag] as any,
        } satisfies IDiscussionBoardArticleTag.IRequest,
      },
    );
  });
  // Test 4: Empty tag array (should clear all tags)
  const update5 = await api.functional.discussionBoard.user.articles.tags.index(
    userConnection,
    {
      articleId: article.id,
      body: {
        tags: [],
      } satisfies IDiscussionBoardArticleTag.IRequest,
    },
  );
  typia.assert(update5);
  TestValidator.equals(
    "empty array should clear all tags",
    update5.data.length,
    0,
  );
}
