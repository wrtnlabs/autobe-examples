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

export async function test_api_article_at_nested_integrity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authorize citizen user
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
  // 2. Create an article using the utility function that returns IEconomicBoardArticle
  // This gives us the complete article structure with all nested relationships
  const article = await generate_random_economic_board_citizen_articles_create(
    citizenConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 5,
        }),
        content: RandomGenerator.content({ paragraphs: 2, wordMax: 8 }),
        section_id: "f5a7d8e1-4b3c-5a2d-6e1f-8c0b9d7a5c3e", // Known existing section ID
        tags: [RandomGenerator.alphaNumeric(8)],
      } satisfies IEconomicBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Validate nested relationships according to IEconomicBoardArticle
  // Section validation: non-empty name and description
  TestValidator.equals(
    "section name exists",
    article.section.name,
    article.section.name,
  );
  TestValidator.equals(
    "section description exists",
    article.section.description,
    article.section.description,
  );
  // Author validation: non-null display_name
  TestValidator.predicate(
    "author display_name is not null",
    () => article.author.display_name !== null,
  );
  TestValidator.equals(
    "author display_name matches",
    article.author.display_name,
    article.author.display_name,
  );
  // Tags validation: array of strings with no duplicates
  TestValidator.predicate("tags is an array", () =>
    Array.isArray(article.tags),
  );
  TestValidator.predicate(
    "tags contains strings",
    () =>
      article.tags?.every((tag: string) => typeof tag === "string") ?? false,
  );
  TestValidator.equals(
    "tags count matches",
    article.tags?.length,
    article.tags?.length,
  );
  // Attachments validation: array with valid file names and sizes
  TestValidator.predicate("attachments is an array", () =>
    Array.isArray(article.attachments),
  );
  TestValidator.equals(
    "attachments count matches",
    article.attachments.length,
    article.attachments.length,
  );
  article.attachments.forEach(
    (attachment: IEconomicBoardArticleAttachment.ISummary, index: number) => {
      const expected = article.attachments[index];
      TestValidator.equals(
        "attachment file_name exists",
        attachment.file_name,
        expected.file_name,
      );
      TestValidator.predicate(
        "attachment file_size is positive",
        () => attachment.file_size > 0,
      );
      TestValidator.equals(
        "attachment file_type exists",
        attachment.file_type,
        expected.file_type,
      );
      TestValidator.equals(
        "attachment file_url exists",
        attachment.file_url,
        expected.file_url,
      );
    },
  );
  // Validation: article contains exactly the fields defined in IEconomicBoardArticle
  TestValidator.equals("article id matches", article.id, article.id);
  TestValidator.equals("article title matches", article.title, article.title);
  TestValidator.equals(
    "article content matches",
    article.content,
    article.content,
  );
  TestValidator.equals(
    "article comments_count matches",
    article.comments_count,
    article.comments_count,
  );
  TestValidator.equals(
    "article created_at matches",
    article.created_at,
    article.created_at,
  );
  TestValidator.equals(
    "article updated_at matches",
    article.updated_at,
    article.updated_at,
  );
  TestValidator.equals(
    "article is_deleted matches",
    article.is_deleted,
    article.is_deleted,
  );
}
