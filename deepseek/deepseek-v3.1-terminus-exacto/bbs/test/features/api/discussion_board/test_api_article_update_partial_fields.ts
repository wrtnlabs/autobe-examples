import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Update only title while keeping content and section unchanged
  const userConnection1: api.IConnection = { host: connection.host };
  const user1 = await authorize_user_join(userConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user1);
  // Create initial article with valid data
  const originalTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 10,
  });
  const originalContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 3,
    sentenceMax: 5,
  });
  const article1 = await generate_random_discussion_board_user_articles_create(
    userConnection1,
    {
      body: {
        title: originalTitle,
        content: originalContent,
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article1);
  // Update only title
  const updatedTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 10,
  });
  const articleWithUpdatedTitle =
    await api.functional.discussionBoard.user.articles.update(userConnection1, {
      articleId: article1.id,
      body: {
        title: updatedTitle,
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(articleWithUpdatedTitle);
  // Validate partial update
  TestValidator.equals(
    "title should be updated",
    articleWithUpdatedTitle.title,
    updatedTitle,
  );
  TestValidator.equals(
    "content should remain unchanged",
    articleWithUpdatedTitle.content,
    originalContent,
  );
  TestValidator.equals(
    "section should remain unchanged",
    articleWithUpdatedTitle.section.id,
    article1.section.id,
  );
  // Test 2: Update only content while keeping title and section unchanged
  const userConnection2: api.IConnection = { host: connection.host };
  const user2 = await authorize_user_join(userConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user2);
  const article2 = await generate_random_discussion_board_user_articles_create(
    userConnection2,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article2);
  // Update only content
  const updatedContent = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 4,
    sentenceMax: 6,
  });
  const articleWithUpdatedContent =
    await api.functional.discussionBoard.user.articles.update(userConnection2, {
      articleId: article2.id,
      body: {
        content: updatedContent,
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(articleWithUpdatedContent);
  // Validate partial update
  TestValidator.equals(
    "content should be updated",
    articleWithUpdatedContent.content,
    updatedContent,
  );
  TestValidator.equals(
    "title should remain unchanged",
    articleWithUpdatedContent.title,
    article2.title,
  );
  TestValidator.equals(
    "section should remain unchanged",
    articleWithUpdatedContent.section.id,
    article2.section.id,
  );
  // Test 3: Minimum length validation
  const userConnection3: api.IConnection = { host: connection.host };
  const user3 = await authorize_user_join(userConnection3, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user3);
  const article3 = await generate_random_discussion_board_user_articles_create(
    userConnection3,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article3);
  // Test minimum title length (5 characters)
  const minTitle = RandomGenerator.alphabets(5);
  const articleWithMinTitle =
    await api.functional.discussionBoard.user.articles.update(userConnection3, {
      articleId: article3.id,
      body: {
        title: minTitle,
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(articleWithMinTitle);
  TestValidator.equals(
    "minimum length title should be accepted",
    articleWithMinTitle.title,
    minTitle,
  );
  // Test minimum content length (50 characters)
  const minContent = RandomGenerator.alphabets(50);
  const articleWithMinContent =
    await api.functional.discussionBoard.user.articles.update(userConnection3, {
      articleId: article3.id,
      body: {
        content: minContent,
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(articleWithMinContent);
  TestValidator.equals(
    "minimum length content should be accepted",
    articleWithMinContent.content,
    minContent,
  );
  // Test 4: Maximum length validation
  const userConnection4: api.IConnection = { host: connection.host };
  const user4 = await authorize_user_join(userConnection4, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user4);
  const article4 = await generate_random_discussion_board_user_articles_create(
    userConnection4,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article4);
  // Test maximum title length (200 characters)
  const maxTitle = RandomGenerator.alphabets(200);
  const articleWithMaxTitle =
    await api.functional.discussionBoard.user.articles.update(userConnection4, {
      articleId: article4.id,
      body: {
        title: maxTitle,
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(articleWithMaxTitle);
  TestValidator.equals(
    "maximum length title should be accepted",
    articleWithMaxTitle.title,
    maxTitle,
  );
  // Test 5: Empty update (no fields provided)
  const userConnection5: api.IConnection = { host: connection.host };
  const user5 = await authorize_user_join(userConnection5, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user5);
  const originalArticle =
    await generate_random_discussion_board_user_articles_create(
      userConnection5,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 10,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 3,
            sentenceMax: 5,
          }),
          section_id: typia.random<string & tags.Format<"uuid">>(),
          status: "published" as const,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(originalArticle);
  // Empty update should not change anything
  const articleWithEmptyUpdate =
    await api.functional.discussionBoard.user.articles.update(userConnection5, {
      articleId: originalArticle.id,
      body: {} satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(articleWithEmptyUpdate);
  TestValidator.equals(
    "empty update should not change title",
    articleWithEmptyUpdate.title,
    originalArticle.title,
  );
  TestValidator.equals(
    "empty update should not change content",
    articleWithEmptyUpdate.content,
    originalArticle.content,
  );
  TestValidator.equals(
    "empty update should not change section",
    articleWithEmptyUpdate.section.id,
    originalArticle.section.id,
  );
}
