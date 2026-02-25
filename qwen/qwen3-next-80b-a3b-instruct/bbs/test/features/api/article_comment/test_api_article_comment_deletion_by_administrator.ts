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
import { generate_random_economic_board_citizen_articles_comments_create } from "../../../generate/generate_random_economic_board_citizen_articles_comments_create";
import { generate_random_economic_board_citizen_articles_create } from "../../../generate/generate_random_economic_board_citizen_articles_create";
import { prepare_random_economic_board_article } from "../../../prepare/prepare_random_economic_board_article";
import { prepare_random_economic_board_comment } from "../../../prepare/prepare_random_economic_board_comment";

export async function test_api_article_comment_deletion_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create citizen user and authenticate
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizen = await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(citizen);
  // 2. Citizen creates article
  const article = await api.functional.economicBoard.citizen.articles.create(
    citizenConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEconomicBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Citizen posts comment on the article
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
  // 4. Create administrator user and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(admin);
  // 5. Administrator deletes the citizen's comment
  await api.functional.economicBoard.citizen.articles.comments.erase(
    adminConnection,
    {
      articleId: article.id,
      commentId: comment.id,
    },
  );
  // 6. Verify comment is really gone: admin can create a new comment on the same article
  const newComment =
    await api.functional.economicBoard.citizen.articles.comments.create(
      adminConnection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEconomicBoardComment.ICreate,
      },
    );
  typia.assert(newComment);
  // 7. Verify the deleted comment no longer exists: attempt to delete again fails with 404
  await TestValidator.error("delete already deleted comment", async () => {
    await api.functional.economicBoard.citizen.articles.comments.erase(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
      },
    );
  });
  // 8. Validate that new comment is different from deleted comment
  TestValidator.notEquals(
    "new comment ID differs from deleted comment",
    newComment.id,
    comment.id,
  );
}
