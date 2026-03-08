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

export async function test_api_article_attachment_image_upload(
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
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create article with authorized member connection
  const article =
    await api.functional.economicPoliticalBoard.member.articles.create(
      memberConnection,
      {
        body: {
          title: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<500>
          >(),
          content: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<50000>
          >(),
          section_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 3. Upload image attachment to article using same authorized connection
  const attachment =
    await api.functional.economicPoliticalBoard.member.articles.attachments.create(
      memberConnection,
      {
        articleId: article.id,
        body: {
          file_url: typia.random<string & tags.Format<"uri">>(),
          file_name: "chart.png",
          file_type: "image",
        } satisfies IEconomicPoliticalBoardAttachment.ICreate,
      },
    );
  typia.assert(attachment);
  // 4. Validate attachment properties
  TestValidator.equals(
    "attachment file type is image",
    attachment.file_type,
    "image",
  );
  TestValidator.equals(
    "attachment file name matches input",
    attachment.file_name,
    "chart.png",
  );
  TestValidator.equals(
    "attachment article id matches",
    attachment.article.id,
    article.id,
  );
  TestValidator.predicate(
    "attachment has valid file url",
    attachment.file_url.length > 0,
  );
  TestValidator.predicate(
    "attachment has created timestamp",
    attachment.created_at !== null,
  );
  TestValidator.predicate(
    "attachment has null deleted_at (active)",
    attachment.deleted_at === null,
  );
}
