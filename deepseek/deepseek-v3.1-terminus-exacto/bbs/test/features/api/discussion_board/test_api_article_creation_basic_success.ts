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

export async function test_api_article_creation_basic_success(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // Register and authenticate a new user
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(authorizedUser);
  // Create article using the utility function with valid data
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
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
  typia.assert(article);
  // Validate article properties
  TestValidator.equals("article has valid UUID", typeof article.id, "string");
  await TestValidator.predicate(
    "article title meets length requirements",
    article.title.length >= 5 && article.title.length <= 200,
  );
  await TestValidator.predicate(
    "article content meets minimum length",
    article.content.length >= 50,
  );
  TestValidator.equals(
    "article status is published",
    article.status,
    "published",
  );
  // Validate author information
  TestValidator.equals(
    "author ID matches user ID",
    article.author.id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "author display name matches",
    article.author.display_name,
    authorizedUser.display_name,
  );
  TestValidator.equals(
    "author bio matches",
    article.author.bio,
    authorizedUser.bio,
  );
  // Validate timestamps
  await TestValidator.predicate(
    "created_at is valid ISO date",
    !isNaN(Date.parse(article.created_at)),
  );
  await TestValidator.predicate(
    "updated_at is valid ISO date",
    !isNaN(Date.parse(article.updated_at)),
  );
  TestValidator.equals(
    "created_at and updated_at are initially equal",
    article.created_at,
    article.updated_at,
  );
  // Validate section information
  await TestValidator.predicate(
    "section has valid UUID",
    typeof article.section.id === "string",
  );
  await TestValidator.predicate(
    "section name is not empty",
    article.section.name.length > 0,
  );
  TestValidator.equals(
    "section status is active",
    article.section.status,
    "active",
  );
  await TestValidator.predicate(
    "section display order is valid",
    article.section.display_order >= 0,
  );
}