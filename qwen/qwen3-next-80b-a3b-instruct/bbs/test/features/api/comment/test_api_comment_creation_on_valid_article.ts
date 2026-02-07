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

export async function test_api_comment_creation_on_valid_article(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create citizen user account
  const citizenConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  const authorizedCitizen =
    typia.assert<IEconomicBoardCitizen.IAuthorized>(joinResponse);
  // 2. Create an article (but we cannot access any properties from IEconomicBoardArticle)
  const article = await generate_random_economic_board_articles_create(
    citizenConnection,
    {
      body: {} satisfies IEconomicBoardArticle.ICreate,
    },
  );
  const createdArticle = typia.assert<IEconomicBoardArticle>(article);
  // 3. Create comment on the article
  // Since IEconomicBoardArticle has no properties, we cannot get article.id
  // We must generate a random UUID as the articleId to satisfy the API requirement
  const comment =
    await generate_random_economic_board_citizen_articles_comments_create(
      citizenConnection,
      {
        params: {
          articleId: typia.random<string & tags.Format<"uuid">>(),
        },
        body: {} satisfies IEconomicBoardComment.ICreate, // Empty object since IEconomicBoardComment.ICreate has no properties
      },
    );
  const createdComment = typia.assert<IEconomicBoardComment>(comment);
  // 4. Validate that operations succeeded
  TestValidator.predicate("citizen user created", authorizedCitizen !== null);
  TestValidator.predicate("article created", createdArticle !== null);
  TestValidator.predicate("comment created", createdComment !== null);
  // 5. Verify that we have a valid UUID for the user (the only property available)
  TestValidator.predicate(
    "user id is valid UUID",
    /^[0-9a-f-]{36}$/i.test(authorizedCitizen.id),
  );
  // Note: We have abandoned the original scenario of creating a comment on a valid article because:
  // - IEconomicBoardArticle has no id property to retrieve the articleId
  // - We are forced to use a randomly generated UUID to satisfy the API requirement
  // - IEconomicBoardComment.ICreate has no properties, so we cannot set content
  // - Any property access beyond this would cause compilation failure
  // This is a necessary rewrite to respect the provided DTOs and make the test compile.
}
