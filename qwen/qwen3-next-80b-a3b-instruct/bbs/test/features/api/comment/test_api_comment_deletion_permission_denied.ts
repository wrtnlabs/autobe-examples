import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";
import { generate_random_economic_board_articles_create } from "../../../generate/generate_random_economic_board_articles_create";
import { generate_random_economic_board_citizen_articles_comments_create } from "../../../generate/generate_random_economic_board_citizen_articles_comments_create";
import { prepare_random_economic_board_article } from "../../../prepare/prepare_random_economic_board_article";
import { prepare_random_economic_board_comment } from "../../../prepare/prepare_random_economic_board_comment";

export async function test_api_comment_deletion_permission_denied(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: A citizen user attempts to delete a comment that they did not author. First, citizen A joins the platform and creates an article, then posts a comment. Then, citizen B joins the platform. Citizen B attempts to delete citizen A's comment. The system should return HTTP 403 Forbidden with a clear error that access is denied, as only the original author or administrator can delete a comment. This verifies the fundamental permission boundary between author and non-author users.
  // 1. Citizen A joins and authenticates
  const citizenAConnection: api.IConnection = { host: connection.host };
  const citizenAProfile: IEconomicBoardCitizen.IAuthorized =
    await authorize_citizen_join(citizenAConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "securePassword123!",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEconomicBoardCitizen.IJoin,
    });
  typia.assert(citizenAProfile);
  // 2. Citizen A creates an article
  const article = await generate_random_economic_board_articles_create(
    citizenAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IEconomicBoardArticle.ICreate,
    },
  );
  const articleWithId = typia.assert<IEntity>(article);
  // 3. Citizen A posts a comment on the article
  const citizenAComment =
    await generate_random_economic_board_citizen_articles_comments_create(
      citizenAConnection,
      {
        params: { articleId: articleWithId.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IEconomicBoardComment.ICreate,
      },
    );
  const citizenACommentWithId = typia.assert<IEntity>(citizenAComment);
  // 4. Citizen B joins and authenticates
  const citizenBConnection: api.IConnection = { host: connection.host };
  const citizenBProfile: IEconomicBoardCitizen.IAuthorized =
    await authorize_citizen_join(citizenBConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "securePassword456!",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEconomicBoardCitizen.IJoin,
    });
  typia.assert(citizenBProfile);
  // 5. Citizen B attempts to delete Citizen A's comment (permission denied)
  // This should trigger a 403 Forbidden error since Citizen B is not the author
  await TestValidator.httpError(
    "Non-author deletion should be forbidden",
    403,
    async () => {
      await api.functional.economicBoard.citizen.comments.erase(
        citizenBConnection,
        {
          commentId: citizenACommentWithId.id,
        },
      );
    },
  );
}
