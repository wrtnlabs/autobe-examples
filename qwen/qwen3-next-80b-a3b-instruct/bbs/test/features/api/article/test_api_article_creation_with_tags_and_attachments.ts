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

export async function test_api_article_creation_with_tags_and_attachments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a citizen user via utility function
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
  // 2. Use a mock section summary object based on DTO definition
  // The article's section property is of type IEconomicBoardSection.ISummary
  const section: IEconomicBoardSection.ISummary =
    typia.random<IEconomicBoardSection.ISummary>();
  // 3. Create pre-uploaded attachments (using mock data since no upload utility exists)
  // Generate unique UUIDs for attachments using typia.random to match schema format
  const attachment1Id: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const attachment2Id: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const attachmentIds: (string & tags.Format<"uuid">)[] = [
    attachment1Id,
    attachment2Id,
  ];
  // 4. Create article with tags and attachments using citizen connection
  const tagsList: (string & tags.MaxLength<50>)[] = [
    "economy",
    "policy",
    "government",
    "democracy",
    "public finance",
  ];
  const article = await api.functional.economicBoard.citizen.articles.create(
    citizenConnection,
    {
      body: {
        title: "The Future of Economic Policy in the Global Economy",
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        section_id: section.id,
        tags: tagsList,
        attachment_ids: attachmentIds,
      } satisfies IEconomicBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 5. Validation of returned article
  TestValidator.equals(
    "title matches",
    article.title,
    "The Future of Economic Policy in the Global Economy",
  );
  TestValidator.predicate("content length >= 10", article.content.length >= 10);
  TestValidator.equals("section id matches", article.section.id, section.id);
  TestValidator.equals("author id matches", article.author.id, citizen.id);
  TestValidator.equals(
    "attachments count matches",
    article.attachments.length,
    2,
  );
  TestValidator.equals("tags count matches", article.tags?.length, 5);
  TestValidator.predicate(
    "created_at is ISO date-time",
    Date.parse(article.created_at) > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    Date.parse(article.updated_at) > 0,
  );
  TestValidator.equals("is_deleted is false", article.is_deleted, false);
  TestValidator.equals("comment count is 0", article.comments_count, 0);
  // Validate that attachments match generated IDs
  attachmentIds.forEach((id) => {
    const attachment = article.attachments.find((a) => a.id === id);
    TestValidator.notEquals("attachment found", attachment, undefined);
    TestValidator.equals("attachment id matches", attachment?.id, id);
  });
  // Validate that tags are properly associated
  if (article.tags) {
    tagsList.forEach((tag) => {
      TestValidator.notEquals(
        "tag found in article",
        article.tags?.find((t) => t === tag),
        undefined,
      );
    });
  }
}
