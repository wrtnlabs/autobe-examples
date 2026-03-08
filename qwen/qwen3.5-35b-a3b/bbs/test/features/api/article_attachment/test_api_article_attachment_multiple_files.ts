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

export async function test_api_article_attachment_multiple_files(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create an article
  const article =
    await api.functional.economicPoliticalBoard.member.articles.create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          section_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(article);
  // 3. Upload first attachment (file type)
  const firstAttachment =
    await api.functional.economicPoliticalBoard.member.articles.attachments.create(
      memberConnection,
      {
        articleId: article.id,
        body: {
          file_url: typia.random<string & tags.Format<"uri">>(),
          file_name: "document.pdf",
          file_type: "file",
        },
      },
    );
  typia.assert(firstAttachment);
  // 4. Upload second attachment (image type) - should create independent record
  const secondAttachment =
    await api.functional.economicPoliticalBoard.member.articles.attachments.create(
      memberConnection,
      {
        articleId: article.id,
        body: {
          file_url: typia.random<string & tags.Format<"uri">>(),
          file_name: "image.png",
          file_type: "image",
        },
      },
    );
  typia.assert(secondAttachment);
  // 5. Verify both attachments are independent records
  TestValidator.notEquals(
    "first and second attachment IDs differ",
    firstAttachment.id,
    secondAttachment.id,
  );
  TestValidator.equals(
    "first attachment has file type",
    firstAttachment.file_type,
    "file",
  );
  TestValidator.equals(
    "second attachment has image type",
    secondAttachment.file_type,
    "image",
  );
  TestValidator.equals(
    "both attachments link to same article",
    firstAttachment.article.id,
    secondAttachment.article.id,
  );
  TestValidator.equals(
    "both attachments link to correct article ID",
    firstAttachment.article.id,
    article.id,
  );
}