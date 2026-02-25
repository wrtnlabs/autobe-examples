import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import type { IEconomicBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticleAttachment";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardComment";
import type { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";
import { generate_random_economic_board_citizen_articles_create } from "../../../generate/generate_random_economic_board_citizen_articles_create";
import { prepare_random_economic_board_article } from "../../../prepare/prepare_random_economic_board_article";

export async function test_api_comment_update_by_owner_within_time_window(
  connection: api.IConnection,
): Promise<void> {
  // 1. Initialize connections
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizenCredentials: IEconomicBoardCitizen.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IEconomicBoardCitizen.IJoin;
  // Register citizen
  const citizen: IEconomicBoardCitizen.IAuthorized =
    await authorize_citizen_join(citizenConnection, {
      body: citizenCredentials,
    });
  typia.assert(citizen);
  // 2. Create an article to host the comment
  const article: IEconomicBoardArticle =
    await generate_random_economic_board_citizen_articles_create(
      citizenConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 8,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          section_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IEconomicBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 3. Create a comment on the article using update endpoint (assumed to create if not exists)
  const firstContent: IEconomicBoardComment.IUpdate = {
    content: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 8,
    }),
  } satisfies IEconomicBoardComment.IUpdate;
  const createdComment: IEconomicBoardComment =
    await api.functional.economicBoard.articles.comments.update(
      citizenConnection,
      {
        articleId: article.id,
        body: firstContent,
      },
    );
  typia.assert(createdComment);
  // 4. Verify comment author and creation timestamp
  TestValidator.equals(
    "comment author matches citizen",
    createdComment.author.id,
    citizen.id,
  );
  const commentCreatedAt = new Date(createdComment.created_at);
  const sixtyMinutesAgo = new Date(commentCreatedAt.getTime() - 60 * 60 * 1000);
  // Verify we are within update window
  const now = new Date();
  const timeDifferenceMs = now.getTime() - commentCreatedAt.getTime();
  TestValidator.predicate(
    "within 60-minute update window",
    () => timeDifferenceMs < 60 * 60 * 1000,
  );
  // 5. Update the comment within the 60-minute window
  const updatedContent: IEconomicBoardComment.IUpdate = {
    content: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 8,
    }),
  } satisfies IEconomicBoardComment.IUpdate;
  const updatedComment: IEconomicBoardComment =
    await api.functional.economicBoard.articles.comments.update(
      citizenConnection,
      {
        articleId: article.id,
        body: updatedContent,
      },
    );
  typia.assert(updatedComment);
  // 6. Validate the update
  TestValidator.equals(
    "comment content updated correctly",
    updatedComment.content,
    updatedContent.content,
  );
  TestValidator.predicate(
    "updated_at is after created_at",
    () =>
      new Date(updatedComment.updated_at) > new Date(createdComment.updated_at),
  );
  TestValidator.equals(
    "comment author unchanged",
    updatedComment.author.id,
    createdComment.author.id,
  );
  TestValidator.equals(
    "article ID unchanged",
    updatedComment.article.id,
    createdComment.article.id,
  );
  TestValidator.notEquals(
    "updated_at differs from created_at",
    updatedComment.updated_at,
    createdComment.created_at,
  );
}
