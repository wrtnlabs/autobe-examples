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

export async function test_api_article_attachment_deletion_non_owner_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register and authenticate member A (article owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAOutput = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAOutput);
  const memberAConnectionWithToken: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAOutput.token.access },
  };
  // 2. Generate a random section ID for article creation
  // Note: Cannot create sections via available API, so using random UUID
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Member A creates an article
  const article =
    await api.functional.economicPoliticalBoard.member.articles.create(
      memberAConnectionWithToken,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          section_id: sectionId,
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 4. Member A uploads an attachment to the article
  const attachment =
    await generate_random_economic_political_board_member_articles_attachments_create(
      memberAConnectionWithToken,
      {
        params: { articleId: article.id },
        body: {
          file_url: typia.random<string & tags.Format<"uri">>(),
          file_name: RandomGenerator.name(),
          file_type: "image",
        },
      },
    );
  typia.assert(attachment);
  // 5. Setup: Register and authenticate member B (non-owner)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBOutput = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberBOutput);
  const memberBConnectionWithToken: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberBOutput.token.access },
  };
  // 6. Member B attempts to delete the attachment (should fail with 403)
  await TestValidator.error("non-owner cannot delete attachment", async () => {
    await api.functional.economicPoliticalBoard.member.articles.attachments.erase(
      memberBConnectionWithToken,
      {
        articleId: article.id,
        attachmentId: attachment.id,
      },
    );
  });
  // 7. Verify attachment deleted_at is NULL (not soft-deleted)
  TestValidator.equals(
    "attachment deleted_at remains NULL after failed deletion",
    attachment.deleted_at,
    null,
  );
}
