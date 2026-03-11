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
import { generate_random_economic_political_board_admin_sections_create } from "../../../generate/generate_random_economic_political_board_admin_sections_create";
import { generate_random_economic_political_board_member_articles_attachments_create } from "../../../generate/generate_random_economic_political_board_member_articles_attachments_create";
import { generate_random_economic_political_board_member_articles_create } from "../../../generate/generate_random_economic_political_board_member_articles_create";
import { prepare_random_economic_political_board_article } from "../../../prepare/prepare_random_economic_political_board_article";
import { prepare_random_economic_political_board_attachment } from "../../../prepare/prepare_random_economic_political_board_attachment";
import { prepare_random_economic_political_board_section } from "../../../prepare/prepare_random_economic_political_board_section";

export async function test_api_article_attachment_multiple_types(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup for section creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuth);
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEconomicPoliticalBoardAdmin.ILogin,
  });
  // 2. Admin creates section
  const section =
    await generate_random_economic_political_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEconomicPoliticalBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Member setup
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IEconomicPoliticalBoardMember.ILogin,
  });
  // 4. Member creates article
  const article =
    await generate_random_economic_political_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 8,
          }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          sectionId: section.id,
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 5. Add multiple attachments of different types
  const attachment1 =
    await generate_random_economic_political_board_member_articles_attachments_create(
      memberConnection,
      {
        body: {
          file_url: typia.random<string & tags.Format<"uri">>(),
          file_name: "report.pdf",
          file_type: "file",
        } satisfies IEconomicPoliticalBoardAttachment.ICreate,
        params: { articleId: article.id },
      },
    );
  typia.assert(attachment1);
  const attachment2 =
    await generate_random_economic_political_board_member_articles_attachments_create(
      memberConnection,
      {
        body: {
          file_url: typia.random<string & tags.Format<"uri">>(),
          file_name: "chart.png",
          file_type: "image",
        } satisfies IEconomicPoliticalBoardAttachment.ICreate,
        params: { articleId: article.id },
      },
    );
  typia.assert(attachment2);
  const attachment3 =
    await generate_random_economic_political_board_member_articles_attachments_create(
      memberConnection,
      {
        body: {
          file_url: typia.random<string & tags.Format<"uri">>(),
          file_name: "spreadsheet.xlsx",
          file_type: "file",
        } satisfies IEconomicPoliticalBoardAttachment.ICreate,
        params: { articleId: article.id },
      },
    );
  typia.assert(attachment3);
  // 6. Validate attachments
  TestValidator.equals("attachment 1 file type", attachment1.file_type, "file");
  TestValidator.equals(
    "attachment 2 file type",
    attachment2.file_type,
    "image",
  );
  TestValidator.equals("attachment 3 file type", attachment3.file_type, "file");
  TestValidator.equals(
    "attachment 1 articleId",
    attachment1.article.id,
    article.id,
  );
  TestValidator.equals(
    "attachment 2 articleId",
    attachment2.article.id,
    article.id,
  );
  TestValidator.equals(
    "attachment 3 articleId",
    attachment3.article.id,
    article.id,
  );
  TestValidator.notEquals(
    "attachment 1 unique id",
    attachment1.id,
    attachment2.id,
  );
  TestValidator.notEquals(
    "attachment 2 unique id",
    attachment2.id,
    attachment3.id,
  );
  TestValidator.notEquals(
    "attachment 1 unique id",
    attachment1.id,
    attachment3.id,
  );
}
