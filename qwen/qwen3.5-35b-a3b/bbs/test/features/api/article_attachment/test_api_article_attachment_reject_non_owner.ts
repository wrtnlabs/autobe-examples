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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
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
import { prepare_random_economic_political_board_attachment } from "../../../prepare/prepare_random_economic_political_board_attachment";

export async function test_api_article_attachment_reject_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as User A (article owner)
  const userAConnection: api.IConnection = { host: connection.host };
  const userA = await authorize_member_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(userA);
  // 2. Create an article (without attachments to simplify test)
  // We use a random section_id - in real test this would need a valid section
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const article =
    await api.functional.economicPoliticalBoard.member.articles.create(
      userAConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 10,
          }),
          content: RandomGenerator.paragraph({ sentences: 5 }),
          section_id: sectionId,
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 3. Authenticate as User B (non-owner)
  const userBConnection: api.IConnection = { host: connection.host };
  const userB = await authorize_member_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(userB);
  // 4. User B attempts to manage attachments on User A's article
  // This should fail with 403 Forbidden due to ownership validation
  await TestValidator.error("non-owner cannot manage attachments", async () => {
    await api.functional.economicPoliticalBoard.member.articles.attachments.manageAttachments(
      userBConnection,
      {
        articleId: article.id,
        body: {
          attachments: [
            {
              file_url: typia.random<string & tags.Format<"uri">>(),
              file_name: "unauthorized_file.pdf",
              file_type: "file",
            },
          ],
          attachmentIds: [],
        } satisfies IEconomicPoliticalBoardArticle.IManageAttachmentsRequest,
      },
    );
  });
  // 5. Also test that non-owner cannot remove attachments
  await TestValidator.error("non-owner cannot remove attachments", async () => {
    await api.functional.economicPoliticalBoard.member.articles.attachments.manageAttachments(
      userBConnection,
      {
        articleId: article.id,
        body: {
          attachments: [],
          attachmentIds: [typia.random<string & tags.Format<"uuid">>()],
        } satisfies IEconomicPoliticalBoardArticle.IManageAttachmentsRequest,
      },
    );
  });
}
