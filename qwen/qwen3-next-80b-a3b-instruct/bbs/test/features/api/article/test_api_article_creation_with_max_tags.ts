import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import type { IEconomicBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticleAttachment";
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
import { generate_random_economic_board_citizen_articles_create } from "../../../generate/generate_random_economic_board_citizen_articles_create";
import { prepare_random_economic_board_article } from "../../../prepare/prepare_random_economic_board_article";

export async function test_api_article_creation_with_max_tags(
  connection: api.IConnection,
): Promise<void> {
  // Create citizen user connection
  const citizenConnection: api.IConnection = { host: connection.host };
  await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  // Generate 10 unique tags (maximum allowed)
  const tags = ArrayUtil.repeat(10, () =>
    RandomGenerator.alphabets(RandomGenerator.pick([5, 6, 7, 8])),
  );
  // Use a generated valid UUID for section_id since no section listing API exists
  // The system must accept any valid UUID, and we assume one exists
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Create article with exactly 10 tags (maximum allowed)
  const article = await api.functional.economicBoard.citizen.articles.create(
    citizenConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 5,
        }),
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
        section_id: sectionId,
        tags: tags as (string & tags.MaxLength<50>)[] & tags.MaxItems<10>,
      } satisfies IEconomicBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Validate article has exactly 10 tags (boundary condition)
  TestValidator.equals("article has exactly 10 tags", article.tags?.length, 10);
  TestValidator.equals(
    "all tags are under 50 characters",
    article.tags?.every((tag) => tag.length <= 50),
    true,
  );
  TestValidator.equals("tag order preserved", article.tags, tags);
  // Verify no additional tags beyond 10 are accepted (could not be tested directly but boundary enforced by schema)
}
