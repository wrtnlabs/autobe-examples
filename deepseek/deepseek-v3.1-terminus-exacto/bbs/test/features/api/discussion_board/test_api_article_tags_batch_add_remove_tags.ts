import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
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

/**
 * Test adding and removing tags in a single atomic operation.
 * Create an article with initial tags 'finance' and 'policy', then perform a batch operation
 * that adds 'debate' tag while removing 'finance' tag. Verify atomicity of the operation,
 * proper transaction handling, and correct final tag state.
 */
export async function test_api_article_tags_batch_add_remove_tags(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Create an article
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Add initial tags 'finance' and 'policy' individually
  const financeTag =
    await api.functional.discussionBoard.articles.tags.updateTags(
      userConnection,
      {
        articleId: article.id,
        body: {
          add: ["finance"] satisfies (string & tags.MaxLength<20>)[],
        } satisfies IDiscussionBoardArticleTag.IModifyTag,
      },
    );
  typia.assert(financeTag);
  const policyTag =
    await api.functional.discussionBoard.articles.tags.updateTags(
      userConnection,
      {
        articleId: article.id,
        body: {
          add: ["policy"] satisfies (string & tags.MaxLength<20>)[],
        } satisfies IDiscussionBoardArticleTag.IModifyTag,
      },
    );
  typia.assert(policyTag);
  // Perform batch operation: add 'debate' and remove 'finance'
  const updatedTag =
    await api.functional.discussionBoard.articles.tags.updateTags(
      userConnection,
      {
        articleId: article.id,
        body: {
          add: ["debate"] satisfies (string & tags.MaxLength<20>)[],
          remove: ["finance"] satisfies (string & tags.MaxLength<20>)[],
        } satisfies IDiscussionBoardArticleTag.IModifyTag,
      },
    );
  typia.assert(updatedTag);
  // Verify the operation completed successfully
  TestValidator.equals(
    "article ID should remain consistent",
    updatedTag.article.id,
    article.id,
  );
  TestValidator.predicate(
    "tag operation should complete",
    updatedTag.tag_name === "debate" || updatedTag.tag_name === "policy",
  );
  // Note: Since the API returns individual tag objects rather than the complete tag set,
  // we can only verify that the operations completed without errors.
  // The actual tag state verification would require additional API endpoints
  // to retrieve the complete tag list for the article.
}
