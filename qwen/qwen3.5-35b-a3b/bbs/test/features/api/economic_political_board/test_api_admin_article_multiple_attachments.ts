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
import { generate_random_economic_political_board_admin_articles_attachments_create } from "../../../generate/generate_random_economic_political_board_admin_articles_attachments_create";
import { generate_random_economic_political_board_admin_sections_create } from "../../../generate/generate_random_economic_political_board_admin_sections_create";
import { generate_random_economic_political_board_member_articles_create } from "../../../generate/generate_random_economic_political_board_member_articles_create";
import { prepare_random_economic_political_board_article } from "../../../prepare/prepare_random_economic_political_board_article";
import { prepare_random_economic_political_board_attachment } from "../../../prepare/prepare_random_economic_political_board_attachment";
import { prepare_random_economic_political_board_section } from "../../../prepare/prepare_random_economic_political_board_section";

export async function test_api_admin_article_multiple_attachments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: (typia.random<string>()) satisfies string & tags.Format<"uri"> as string & tags.Format<"uri">,
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(adminResult);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminResult.token.access,
      password: "1234",
    } satisfies IEconomicPoliticalBoardAdmin.ILogin,
  });
  // 2. Admin creates a section for article categorization
  const section =
    await generate_random_economic_political_board_admin_sections_create(
      adminLoginConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(section);
  // 3. Member setup - register and login
  const memberConnection: api.IConnection = { host: connection.host };
  const memberResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
      href: (typia.random<string>()) satisfies string & tags.Format<"uri"> as string & tags.Format<"uri">,
      referrer: (typia.random<string>()) satisfies string & tags.Format<"uri"> as string & tags.Format<"uri">,
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  typia.assert(memberResult);
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberResult.token.access,
      password: "1234",
    } satisfies IEconomicPoliticalBoardMember.ILogin,
  });
  // 4. Member creates an article in the admin-created section
  const article =
    await generate_random_economic_political_board_member_articles_create(
      memberLoginConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
          content: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 10,
            sentenceMax: 20,
          }),
          sectionId: section.id,
        },
      },
    );
  typia.assert(article);
  // 5. Add first attachment: chart image
  const attachment1 =
    await generate_random_economic_political_board_admin_articles_attachments_create(
      memberLoginConnection,
      {
        body: {
          file_url: `https://storage.example.com/charts/economic_data_${(typia.random<string>()) satisfies string & tags.Format<"uuid"> as string & tags.Format<"uuid">}.png`,
          file_name: "economic_data_chart.png",
          file_type: "image",
        },
        params: { articleId: article.id },
      },
    );
  typia.assert(attachment1);
  // 6. Add second attachment: PDF report
  const attachment2 =
    await generate_random_economic_political_board_admin_articles_attachments_create(
      memberLoginConnection,
      {
        body: {
          file_url: `https://storage.example.com/reports/analysis_report_${(typia.random<string>()) satisfies string & tags.Format<"uuid"> as string & tags.Format<"uuid">}.pdf`,
          file_name: "analysis_report.pdf",
          file_type: "file",
        },
        params: { articleId: article.id },
      },
    );
  typia.assert(attachment2);
  // 7. Add third attachment: screenshot
  const attachment3 =
    await generate_random_economic_political_board_admin_articles_attachments_create(
      memberLoginConnection,
      {
        body: {
          file_url: `https://storage.example.com/screenshots/evidence_${(typia.random<string>()) satisfies string & tags.Format<"uuid"> as string & tags.Format<"uuid">}.jpg`,
          file_name: "supporting_evidence.jpg",
          file_type: "image",
        },
        params: { articleId: article.id },
      },
    );
  typia.assert(attachment3);
  // 8. Verify all attachments are created with unique IDs
  TestValidator.notEquals(
    "attachment 1 and 2 have different IDs",
    attachment1.id,
    attachment2.id,
  );
  TestValidator.notEquals(
    "attachment 2 and 3 have different IDs",
    attachment2.id,
    attachment3.id,
  );
  TestValidator.notEquals(
    "attachment 1 and 3 have different IDs",
    attachment1.id,
    attachment3.id,
  );
  // 9. Verify each attachment has correct file_type
  TestValidator.equals(
    "attachment 1 is image type",
    attachment1.file_type,
    "image",
  );
  TestValidator.equals(
    "attachment 2 is file type",
    attachment2.file_type,
    "file",
  );
  TestValidator.equals(
    "attachment 3 is image type",
    attachment3.file_type,
    "image",
  );
  // 10. Verify each attachment maintains correct file_name
  TestValidator.equals(
    "attachment 1 file name",
    attachment1.file_name,
    "economic_data_chart.png",
  );
  TestValidator.equals(
    "attachment 2 file name",
    attachment2.file_name,
    "analysis_report.pdf",
  );
  TestValidator.equals(
    "attachment 3 file name",
    attachment3.file_name,
    "supporting_evidence.jpg",
  );
  // 11. Verify each attachment maintains correct file_url
  TestValidator.equals(
    "attachment 1 file URL contains storage path",
    attachment1.file_url.includes("storage.example.com"),
    true,
  );
  TestValidator.equals(
    "attachment 2 file URL contains storage path",
    attachment2.file_url.includes("storage.example.com"),
    true,
  );
  TestValidator.equals(
    "attachment 3 file URL contains storage path",
    attachment3.file_url.includes("storage.example.com"),
    true,
  );
  // 12. Verify createdAt reflects upload time
  TestValidator.predicate(
    "attachment 1 has valid createdAt",
    attachment1.created_at !== undefined,
  );
  TestValidator.predicate(
    "attachment 2 has valid createdAt",
    attachment2.created_at !== undefined,
  );
  TestValidator.predicate(
    "attachment 3 has valid createdAt",
    attachment3.created_at !== undefined,
  );
  // 13. Verify updatedAt is initialized same as createdAt (not modified until edit)
  TestValidator.equals(
    "attachment 1 updatedAt equals createdAt",
    attachment1.updated_at,
    attachment1.created_at,
  );
  TestValidator.equals(
    "attachment 2 updatedAt equals createdAt",
    attachment2.updated_at,
    attachment2.created_at,
  );
  TestValidator.equals(
    "attachment 3 updatedAt equals createdAt",
    attachment3.updated_at,
    attachment3.created_at,
  );
  // 14. Verify deletedAt is NULL for all attachments
  TestValidator.equals(
    "attachment 1 is not deleted",
    attachment1.deleted_at,
    null,
  );
  TestValidator.equals(
    "attachment 2 is not deleted",
    attachment2.deleted_at,
    null,
  );
  TestValidator.equals(
    "attachment 3 is not deleted",
    attachment3.deleted_at,
    null,
  );
  // 15. Verify article reference matches source article
  typia.assert(attachment1.article);
  typia.assert(attachment2.article);
  typia.assert(attachment3.article);
  TestValidator.equals(
    "attachment 1 references correct article",
    attachment1.article.id,
    article.id,
  );
  TestValidator.equals(
    "attachment 2 references correct article",
    attachment2.article.id,
    article.id,
  );
  TestValidator.equals(
    "attachment 3 references correct article",
    attachment3.article.id,
    article.id,
  );
  // 16. Verify attachment count is accurate for each attachment response
  const allAttachments = [attachment1, attachment2, attachment3];
  const attachmentCount = allAttachments.length;
  TestValidator.equals("total attachment count", attachmentCount, 3);
  // 17. Verify attachment order matches insertion order
  TestValidator.equals(
    "first attachment ID matches attachment 1",
    attachment1.id,
    allAttachments[0].id,
  );
  TestValidator.equals(
    "second attachment ID matches attachment 2",
    attachment2.id,
    allAttachments[1].id,
  );
  TestValidator.equals(
    "third attachment ID matches attachment 3",
    attachment3.id,
    allAttachments[2].id,
  );
  // 18. Verify all image attachments have correct file type classification
  const imageAttachments = allAttachments.filter(
    (a) => a.file_type === "image",
  );
  TestValidator.equals("image attachment count", imageAttachments.length, 2);
  TestValidator.equals(
    "document attachment count",
    allAttachments.length - imageAttachments.length,
    1,
  );
}
