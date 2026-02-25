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
import { generate_random_discussion_board_user_articles_tags_create } from "../../../generate/generate_random_discussion_board_user_articles_tags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";

export async function test_api_article_tag_update_successful_name_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate user
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(authorizedUser);
  // 2. Create article
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 7,
        }),
        content: RandomGenerator.content({
          paragraphs: 1,
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
  // 3. Create initial tag with constrained length
  const initialTagName = RandomGenerator.alphabets(15); // Ensure reasonable length
  const initialTag =
    await generate_random_discussion_board_user_articles_tags_create(
      userConnection,
      {
        params: { articleId: article.id },
        body: {
          tag_name: initialTagName,
        } satisfies IDiscussionBoardArticleTag.ICreate,
      },
    );
  typia.assert(initialTag);
  // 4. Update tag name with different name
  const updatedTagName = RandomGenerator.alphabets(20); // Different length
  const updatedTag =
    await api.functional.discussionBoard.user.articles.tags.update(
      userConnection,
      {
        articleId: article.id,
        tagId: initialTag.id,
        body: {
          tag_name: updatedTagName,
        } satisfies IDiscussionBoardArticleTag.IUpdate,
      },
    );
  typia.assert(updatedTag);
  // 5. Validate successful update
  TestValidator.equals(
    "tag name should be updated",
    updatedTag.tag_name,
    updatedTagName,
  );
  TestValidator.notEquals(
    "updated_at should be different",
    updatedTag.updated_at,
    initialTag.updated_at,
  );
  TestValidator.equals(
    "tag id should remain the same",
    updatedTag.id,
    initialTag.id,
  );
  TestValidator.equals(
    "article id should remain the same",
    updatedTag.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedTag.created_at,
    initialTag.created_at,
  );
  // Additional validations
  TestValidator.predicate("updated_at should be valid ISO string", () => {
    return !isNaN(new Date(updatedTag.updated_at).getTime());
  });
  TestValidator.predicate("tag name should meet minimum length", () => {
    return updatedTag.tag_name.length >= 1;
  });
  TestValidator.predicate("updated_at should be newer than created_at", () => {
    return new Date(updatedTag.updated_at) > new Date(updatedTag.created_at);
  });
  // Verify unique constraint handling by creating another tag with different name
  const secondTag =
    await generate_random_discussion_board_user_articles_tags_create(
      userConnection,
      {
        params: { articleId: article.id },
        body: {
          tag_name: RandomGenerator.alphabets(12),
        } satisfies IDiscussionBoardArticleTag.ICreate,
      },
    );
  typia.assert(secondTag);
  TestValidator.notEquals(
    "second tag should have different id",
    secondTag.id,
    updatedTag.id,
  );
  TestValidator.notEquals(
    "second tag should have different name",
    secondTag.tag_name,
    updatedTag.tag_name,
  );
}
