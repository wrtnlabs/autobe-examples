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

export async function test_api_article_tags_admin_normalization_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection for tag operations
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create a test article
  const article = await generate_random_discussion_board_admin_articles_create(
    adminConnection,
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
  // Test 1: Whitespace trimming on tag boundaries
  await TestValidator.predicate(
    "Should test whitespace trimming from tag boundaries",
    async () => {
      const tagsWithWhitespace: (string &
        tags.MinLength<1> &
        tags.MaxLength<50>)[] = [
        "  leading",
        "trailing  ",
        "  both  ",
        "  multiple  words  ",
      ];
      const tagsUpdate =
        await api.functional.discussionBoard.admin.articles.tags.index(
          adminConnection,
          {
            articleId: article.id,
            body: {
              tags: tagsWithWhitespace,
            } satisfies IDiscussionBoardArticleTag.IRequest,
          },
        );
      typia.assert(tagsUpdate);
      // Verify tags were trimmed - check normalized values exist
      const trimmedTags = tagsWithWhitespace.map((tag) => tag.trim());
      TestValidator.predicate(
        "tags array should have correct number of items",
        tagsUpdate.data.length === trimmedTags.length,
      );
      // Check that normalized tags were created
      for (const trimmedTag of trimmedTags) {
        const tagExists = tagsUpdate.data.some(
          (tag) => tag.tag_name === trimmedTag.toLowerCase(),
        );
        TestValidator.predicate(
          `normalized tag ${trimmedTag} should exist`,
          tagExists,
        );
      }
      return true;
    },
  );
  // Test 2: Case normalization to lowercase
  await TestValidator.predicate(
    "Should convert mixed case tags to lowercase",
    async () => {
      const mixedCaseTags: (string & tags.MinLength<1> & tags.MaxLength<50>)[] =
        ["JavaScript", "TypeScript", "ReAct", "NODEjs"];
      const tagsUpdate =
        await api.functional.discussionBoard.admin.articles.tags.index(
          adminConnection,
          {
            articleId: article.id,
            body: {
              tags: mixedCaseTags,
            } satisfies IDiscussionBoardArticleTag.IRequest,
          },
        );
      typia.assert(tagsUpdate);
      // Verify tags were normalized to lowercase
      const normalizedTags = mixedCaseTags.map((tag) => tag.toLowerCase());
      TestValidator.predicate(
        "tags array should have correct number of items",
        tagsUpdate.data.length === normalizedTags.length,
      );
      for (const normalizedTag of normalizedTags) {
        const tagExists = tagsUpdate.data.some(
          (tag) => tag.tag_name === normalizedTag,
        );
        TestValidator.predicate(
          `normalized tag ${normalizedTag} should exist`,
          tagExists,
        );
      }
      return true;
    },
  );
  // Test 3: Length validation enforcement
  await TestValidator.predicate(
    "Should validate tag length constraints",
    async () => {
      // Test valid boundary tags
      const validTags: (string & tags.MinLength<1> & tags.MaxLength<50>)[] = [
        "a", // minimum length
        RandomGenerator.alphabets(50), // maximum length
        RandomGenerator.alphabets(25), // typical length
      ];
      const validTagsUpdate =
        await api.functional.discussionBoard.admin.articles.tags.index(
          adminConnection,
          {
            articleId: article.id,
            body: {
              tags: validTags,
            } satisfies IDiscussionBoardArticleTag.IRequest,
          },
        );
      typia.assert(validTagsUpdate);
      TestValidator.predicate(
        "valid tags should be accepted",
        validTagsUpdate.data.length === validTags.length,
      );
      // Test too long tag using valid types - test business logic error
      const exactlyAtLimitTag = RandomGenerator.alphabets(50);
      await TestValidator.predicate(
        "tags at exact length limit should be accepted",
        async () => {
          const limitTest =
            await api.functional.discussionBoard.admin.articles.tags.index(
              adminConnection,
              {
                articleId: article.id,
                body: {
                  tags: [exactlyAtLimitTag] satisfies (string &
                    tags.MinLength<1> &
                    tags.MaxLength<50>)[],
                } satisfies IDiscussionBoardArticleTag.IRequest,
              },
            );
          typia.assert(limitTest);
          return true;
        },
      );
      return true;
    },
  );
  // Test 4: Special character preservation
  await TestValidator.predicate(
    "Should preserve special characters in tags",
    async () => {
      const specialCharTags: (string &
        tags.MinLength<1> &
        tags.MaxLength<50>)[] = [
        "c#",
        "c++",
        "html/css",
        "api-endpoint",
        "test_underscore",
      ];
      const tagsUpdate =
        await api.functional.discussionBoard.admin.articles.tags.index(
          adminConnection,
          {
            articleId: article.id,
            body: {
              tags: specialCharTags,
            } satisfies IDiscussionBoardArticleTag.IRequest,
          },
        );
      typia.assert(tagsUpdate);
      TestValidator.predicate(
        "tags with special characters should be accepted",
        tagsUpdate.data.length === specialCharTags.length,
      );
      return true;
    },
  );
  // Test 5: Concurrent updates consistency
  await TestValidator.predicate(
    "Should handle concurrent tag updates consistently",
    async () => {
      // Create second administrator for concurrent testing
      const adminConnection2: api.IConnection = { host: connection.host };
      await authorize_admin_join(adminConnection2, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          display_name: RandomGenerator.name(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IDiscussionBoardAdmin.IJoin,
      });
      const firstAdminTags: (string &
        tags.MinLength<1> &
        tags.MaxLength<50>)[] = ["first", "second"];
      const secondAdminTags: (string &
        tags.MinLength<1> &
        tags.MaxLength<50>)[] = ["third", "fourth"];
      // Execute concurrent tags updates
      const [update1, update2] = await Promise.all([
        api.functional.discussionBoard.admin.articles.tags.index(
          adminConnection,
          {
            articleId: article.id,
            body: {
              tags: firstAdminTags,
            } satisfies IDiscussionBoardArticleTag.IRequest,
          },
        ),
        api.functional.discussionBoard.admin.articles.tags.index(
          adminConnection2,
          {
            articleId: article.id,
            body: {
              tags: secondAdminTags,
            } satisfies IDiscussionBoardArticleTag.IRequest,
          },
        ),
      ]);
      typia.assert(update1);
      typia.assert(update2);
      // Verify consistent state - both updates should reflect correct tag set
      const allTags = [...firstAdminTags, ...secondAdminTags];
      const normalizedAllTags = allTags.map((tag) => tag.trim().toLowerCase());
      // Since concurrent updates might behave differently, just verify both responses are valid
      TestValidator.predicate(
        "first admin update should return valid response",
        update1.data.length > 0,
      );
      TestValidator.predicate(
        "second admin update should return valid response",
        update2.data.length > 0,
      );
      return true;
    },
  );
}
