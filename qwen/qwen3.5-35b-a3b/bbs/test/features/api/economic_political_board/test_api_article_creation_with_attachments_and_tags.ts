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
import { generate_random_economic_political_board_member_articles_create } from "../../../generate/generate_random_economic_political_board_member_articles_create";
import { prepare_random_economic_political_board_article } from "../../../prepare/prepare_random_economic_political_board_article";
import { prepare_random_economic_political_board_article_attachment } from "../../../prepare/prepare_random_economic_political_board_article_attachment";

export async function test_api_article_creation_with_attachments_and_tags(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Member connection is already updated by authorize_member_join internally
  // 3. Create article with multiple attachments and tags
  const article =
    await api.functional.economicPoliticalBoard.member.articles.create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 5,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          section_id: "00000000-0000-0000-0000-000000000001", // placeholder for existing section
          attachmentData: [
            {
              file_url: "https://example.com/chart.png",
              file_name: "chart.png",
              file_type: "image" as const,
            },
            {
              file_url: "https://example.com/document.pdf",
              file_name: "report.pdf",
              file_type: "file" as const,
            },
          ],
          tagIds: [
            "00000000-0000-0000-0000-000000000001", // placeholder for existing tag
          ],
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 4. Validate article structure
  TestValidator.equals("article has unique id", article.id !== undefined, true);
  TestValidator.equals(
    "article title is not empty",
    article.title.length > 0,
    true,
  );
  TestValidator.equals(
    "article content is not empty",
    article.content.length > 0,
    true,
  );
  TestValidator.equals(
    "article has author",
    article.author !== undefined,
    true,
  );
  TestValidator.equals(
    "article has section",
    article.section !== undefined,
    true,
  );
  TestValidator.equals(
    "article created_at is ISO format",
    article.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "article updated_at is ISO format",
    article.updated_at !== undefined,
    true,
  );
  TestValidator.equals(
    "article is active (not deleted)",
    article.deleted_at,
    null,
  );
  // 5. Validate attachments count and structure
  TestValidator.equals(
    "article has attachments array",
    Array.isArray(article.attachments),
    true,
  );
  TestValidator.equals(
    "attachment count matches request",
    article.attachments.length,
    2,
  );
  // 6. Validate image attachment
  const imageAttachment = article.attachments.find(
    (a) => a.file_type === "image",
  );
  TestValidator.equals(
    "image attachment found in response",
    imageAttachment !== undefined,
    true,
  );
  if (imageAttachment) {
    TestValidator.equals(
      "image attachment filename preserved",
      imageAttachment.file_name,
      "chart.png",
    );
    TestValidator.equals(
      "image attachment URL preserved",
      imageAttachment.file_url,
      "https://example.com/chart.png",
    );
  }
  // 7. Validate file attachment
  const fileAttachment = article.attachments.find(
    (a) => a.file_type === "file",
  );
  TestValidator.equals(
    "file attachment found in response",
    fileAttachment !== undefined,
    true,
  );
  if (fileAttachment) {
    TestValidator.equals(
      "file attachment filename preserved",
      fileAttachment.file_name,
      "report.pdf",
    );
    TestValidator.equals(
      "file attachment URL preserved",
      fileAttachment.file_url,
      "https://example.com/document.pdf",
    );
  }
  // 8. Validate tags count and structure
  TestValidator.equals(
    "article has tags array",
    Array.isArray(article.tags),
    true,
  );
  TestValidator.equals("tag count matches request", article.tags.length, 1);
  if (article.tags.length > 0) {
    const tag = article.tags[0];
    TestValidator.equals("tag has unique id", tag.id !== undefined, true);
    TestValidator.equals("tag name is not empty", tag.name.length > 0, true);
    TestValidator.equals(
      "tag has created_at",
      tag.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "tag has updated_at",
      tag.updated_at !== undefined,
      true,
    );
  }
  // 9. Verify atomic creation - article with all attachments and tags is returned
  TestValidator.equals(
    "all components returned atomically",
    article.attachments.length === 2 && article.tags.length === 1,
    true,
  );
}
