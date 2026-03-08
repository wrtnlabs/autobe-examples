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

export async function test_api_article_attachment_file_upload(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(joinConnection, {
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
  // 2. Create member-specific connection for authenticated requests
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { Authorization: memberAuth.token.access };
  // 3. Create article to attach file to
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const article =
    await api.functional.economicPoliticalBoard.member.articles.create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.paragraph({ sentences: 5 }),
          section_id: sectionId,
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 4. Upload file attachment to the article
  const attachment =
    await api.functional.economicPoliticalBoard.member.articles.attachments.create(
      memberConnection,
      {
        articleId: article.id,
        body: {
          file_url: typia.random<string & tags.Format<"uri">>(),
          file_name: RandomGenerator.alphabets(10) + ".pdf",
          file_type: "file" as const,
        } satisfies IEconomicPoliticalBoardAttachment.ICreate,
      },
    );
  typia.assert(attachment);
  // 5. Validate attachment response structure
  TestValidator.equals(
    "attachment id exists",
    attachment.id !== undefined,
    true,
  );
  TestValidator.equals(
    "attachment file_type is file",
    attachment.file_type,
    "file",
  );
  TestValidator.equals(
    "attachment article references correct article",
    attachment.article.id,
    article.id,
  );
  TestValidator.predicate(
    "attachment created_at is valid date-time",
    () => !isNaN(Date.parse(attachment.created_at)),
  );
  TestValidator.predicate(
    "attachment updated_at is valid date-time",
    () => !isNaN(Date.parse(attachment.updated_at)),
  );
  TestValidator.equals(
    "attachment deleted_at is null (active)",
    attachment.deleted_at,
    null,
  );
}
