import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import type { IEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAttachment";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import type { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import type { IEconomicPoliticalBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardAttachment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_economic_political_board_admin_sections_create } from "../../../generate/generate_random_economic_political_board_admin_sections_create";
import { generate_random_economic_political_board_member_articles_create } from "../../../generate/generate_random_economic_political_board_member_articles_create";
import { prepare_random_economic_political_board_article } from "../../../prepare/prepare_random_economic_political_board_article";
import { prepare_random_economic_political_board_attachment } from "../../../prepare/prepare_random_economic_political_board_attachment";
import { prepare_random_economic_political_board_section } from "../../../prepare/prepare_random_economic_political_board_section";

/**
 * Test member author successfully adds file attachments to their own article.
 * 1. Register member and admin accounts
 * 2. Admin creates a section
 * 3. Member creates an article in that section
 * 4. Member adds a file attachment to their article
 * 5. Verify attachment metadata and pagination
 */
export async function test_api_article_attachment_creation_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Generate member credentials for login
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "1234";
  const memberName = RandomGenerator.name();
  const memberHref = typia.random<string & tags.Format<"uri">>();
  const memberReferrer = typia.random<string & tags.Format<"uri">>();
  // 1. Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      name: memberName,
      href: memberHref,
      referrer: memberReferrer,
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  // 3. Admin creates a section
  const section =
    await api.functional.economicPoliticalBoard.admin.sections.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEconomicPoliticalBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 4. Authenticate member
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IEconomicPoliticalBoardMember.ILogin,
  });
  // 5. Member creates an article
  const article =
    await api.functional.economicPoliticalBoard.member.articles.create(
      memberLoginConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          sectionId: section.id,
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 6. Member adds a file attachment
  const attachmentResponse =
    await api.functional.economicPoliticalBoard.member.articles.attachments.updateAttachments(
      memberLoginConnection,
      {
        articleId: article.id,
        body: {
          operations: [
            {
              action: "add" as const,
              file_url: "https://storage.example.com/documents/report.pdf",
              file_name: "report.pdf",
              file_type: "file" as const,
            },
          ],
        } satisfies IEconomicPoliticalBoardAttachment.IManage,
      },
    );
  typia.assert(attachmentResponse);
  // 7. Verify attachment metadata
  const attachment = attachmentResponse.data.at(0);
  TestValidator.equals(
    "attachment fileUrl",
    attachment?.fileUrl,
    "https://storage.example.com/documents/report.pdf",
  );
  TestValidator.equals(
    "attachment fileName",
    attachment?.fileName,
    "report.pdf",
  );
  TestValidator.equals("attachment fileType", attachment?.fileType, "file");
  TestValidator.notEquals("attachment has id", attachment?.id, null);
  TestValidator.notEquals(
    "attachment has createdAt",
    attachment?.createdAt,
    null,
  );
  // 8. Verify pagination metadata
  TestValidator.equals(
    "pagination current",
    attachmentResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records",
    attachmentResponse.pagination.records,
    1,
  );
  TestValidator.equals(
    "pagination pages",
    attachmentResponse.pagination.pages,
    1,
  );
}
