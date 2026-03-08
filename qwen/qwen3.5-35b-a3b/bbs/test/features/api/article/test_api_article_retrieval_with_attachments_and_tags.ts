import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import type { IEconomicPoliticalBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticleAttachment";
import type { IEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAttachment";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import type { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import type { IEconomicPoliticalBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_economic_political_board_member_articles_attachments_create } from "../../../generate/generate_random_economic_political_board_member_articles_attachments_create";
import { generate_random_economic_political_board_member_articles_create } from "../../../generate/generate_random_economic_political_board_member_articles_create";
import { prepare_random_economic_political_board_article } from "../../../prepare/prepare_random_economic_political_board_article";
import { prepare_random_economic_political_board_article_attachment } from "../../../prepare/prepare_random_economic_political_board_article_attachment";
import { prepare_random_economic_political_board_attachment } from "../../../prepare/prepare_random_economic_political_board_attachment";

export async function test_api_article_retrieval_with_attachments_and_tags(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://test.com/register",
      referrer: "https://test.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create article with attachments and tags
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const tagIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const article =
    await generate_random_economic_political_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 20,
          }),
          section_id: sectionId,
          tagIds: tagIds,
          attachmentData: [
            {
              file_url: "https://storage.test.com/images/photo.jpg",
              file_name: "photo.jpg",
              file_type: "image",
            },
            {
              file_url: "https://storage.test.com/files/report.pdf",
              file_name: "report.pdf",
              file_type: "file",
            },
          ],
        },
      },
    );
  typia.assert(article);
  // 3. Retrieve the article
  const retrievedArticle =
    await api.functional.economicPoliticalBoard.member.articles.at(
      memberConnection,
      { articleId: article.id },
    );
  typia.assert(retrievedArticle);
  // 4. Validate attachments
  TestValidator.equals(
    "attachments count matches",
    retrievedArticle.attachments.length,
    article.attachments.length,
  );
  for (const attachment of retrievedArticle.attachments) {
    TestValidator.predicate(
      "attachment has valid file_url",
      attachment.file_url.startsWith("http"),
    );
    TestValidator.predicate(
      "attachment has file_name",
      attachment.file_name.length > 0,
    );
    TestValidator.predicate(
      "attachment has file_type",
      attachment.file_type === "image" || attachment.file_type === "file",
    );
  }
  // 5. Validate tags
  TestValidator.equals(
    "tags count matches",
    retrievedArticle.tags.length,
    article.tags.length,
  );
  for (const tag of retrievedArticle.tags) {
    TestValidator.predicate(
      "tag has valid id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        tag.id,
      ),
    );
    TestValidator.predicate("tag has name", /^[a-zA-Z0-9-]+$/.test(tag.name));
  }
  // 6. Validate section
  TestValidator.predicate(
    "section has name",
    retrievedArticle.section.name.length > 0,
  );
  TestValidator.predicate(
    "section has article count",
    retrievedArticle.section.articleCount >= 0,
  );
  // 7. Validate author
  TestValidator.predicate(
    "author has user with displayName",
    retrievedArticle.author.user.displayName.length > 0,
  );
}
