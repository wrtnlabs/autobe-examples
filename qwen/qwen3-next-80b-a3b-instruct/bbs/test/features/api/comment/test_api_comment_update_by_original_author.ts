import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";
import { generate_random_economic_board_administrator_sections_create } from "../../../generate/generate_random_economic_board_administrator_sections_create";
import { generate_random_economic_board_citizen_articles_comments_create } from "../../../generate/generate_random_economic_board_citizen_articles_comments_create";
import { generate_random_economic_board_citizen_articles_create } from "../../../generate/generate_random_economic_board_citizen_articles_create";
import { prepare_random_economic_board_article } from "../../../prepare/prepare_random_economic_board_article";
import { prepare_random_economic_board_comment } from "../../../prepare/prepare_random_economic_board_comment";
import { prepare_random_economic_board_section } from "../../../prepare/prepare_random_economic_board_section";

export async function test_api_comment_update_by_original_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - Create a section
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEconomicBoardAdministrator.IJoin,
  });
  const section =
    await api.functional.economicBoard.administrator.sections.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEconomicBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 2. Citizen setup - Join and login
  const citizenConnection: api.IConnection = { host: connection.host };
  await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  // Note: After join, citizenConnection is already authorized. No need to login again.
  // The authorize_citizen_join function sets the Authorization header.
  // 3. Citizen creates an article in the created section
  const article = await api.functional.economicBoard.citizen.articles.create(
    citizenConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: section.id,
      } satisfies IEconomicBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 4. Citizen posts a comment on the article
  const comment =
    await api.functional.economicBoard.citizen.articles.comments.create(
      citizenConnection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEconomicBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  const originalCreatedAt = comment.created_at;
  // 5. Citizen updates the comment within the 60-minute window
  const updatedComment =
    await api.functional.economicBoard.administrator.articles.comments.update(
      citizenConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEconomicBoardComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // 6. Validate the updated comment
  TestValidator.equals(
    "comment content updated",
    updatedComment.content,
    comment.content,
  );
  TestValidator.predicate(
    "updated_at is later than created_at",
    new Date(updatedComment.updated_at) > new Date(originalCreatedAt),
  );
  TestValidator.equals("comment id unchanged", updatedComment.id, comment.id);
  TestValidator.equals(
    "article id unchanged",
    updatedComment.article.id,
    article.id,
  );
  TestValidator.equals(
    "author unchanged",
    updatedComment.author.id,
    comment.author.id,
  );
  TestValidator.predicate("is not deleted", updatedComment.deleted_at === null);
}
