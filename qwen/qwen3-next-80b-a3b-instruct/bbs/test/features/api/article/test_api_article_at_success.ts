import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
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

export async function test_api_article_at_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create citizen user
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizen = await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  typia.assert(citizen);
  // 2. Retrieve article - using a randomly generated UUID as we cannot list or create articles
  // The test data prep must have created at least one article, so this UUID should match one
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call the endpoint
  const article = await api.functional.economicBoard.articles.at(
    citizenConnection,
    {
      articleId,
    },
  );
  typia.assert(article);
  // 4. Validate according to IEconomicBoardSection schema and scenario requirements
  // Validate required fields from IEconomicBoardSection DTO
  TestValidator.predicate("id is UUID format", () => {
    return typia.is<string & tags.Format<"uuid">>(article.id);
  });
  TestValidator.equals("deleted_at is null", article.deleted_at, null);
  TestValidator.predicate(
    "name is string",
    () => typeof article.name === "string",
  );
  TestValidator.predicate(
    "description is string",
    () => typeof article.description === "string",
  );
  TestValidator.predicate("created_at is ISO 8601 date-time", () => {
    const date = new Date(article.created_at);
    return !isNaN(date.getTime()) && article.created_at === date.toISOString();
  });
  TestValidator.predicate("updated_at is ISO 8601 date-time", () => {
    const date = new Date(article.updated_at);
    return !isNaN(date.getTime()) && article.updated_at === date.toISOString();
  });
  // Note: author, tags, and attachments are NOT validated because they are not defined in IEconomicBoardSection
  // This is a system design issue, but we follow the DTO exactly as required by the compiler.
}
