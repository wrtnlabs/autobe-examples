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
import { generate_random_economic_political_board_member_articles_create } from "../../../generate/generate_random_economic_political_board_member_articles_create";
import { prepare_random_economic_political_board_article } from "../../../prepare/prepare_random_economic_political_board_article";
import { prepare_random_economic_political_board_attachment } from "../../../prepare/prepare_random_economic_political_board_attachment";
import { prepare_random_economic_political_board_section } from "../../../prepare/prepare_random_economic_political_board_section";

/**
 * Test member article creation with attachments and tags.
 * 1. Admin creates account and section
 * 2. Member creates account
 * 3. Member creates article with tags and attachments
 * 4. Validate article structure and data
 */
export async function test_api_member_article_creation_with_attachments_and_tags(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin account
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminAuth = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Login with admin credentials
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEconomicPoliticalBoardAdmin.ILogin,
  });
  // Admin creates section
  const section =
    await api.functional.economicPoliticalBoard.admin.sections.create(
      adminLoginConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEconomicPoliticalBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 2. Member setup - create member account
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberName = RandomGenerator.name();
  const memberAuth = await authorize_member_join(memberJoinConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      name: memberName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // Login with member credentials
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IEconomicPoliticalBoardMember.ILogin,
  });
  // 3. Member creates article with tags and attachments
  const tagsInput: string[] = ["politics", "economy"];
  const attachments: IEconomicPoliticalBoardAttachment.ICreate[] = [
    {
      file_url: "https://example.com/images/chart.png",
      file_name: "chart.png",
      file_type: "image",
    },
    {
      file_url: "https://example.com/files/report.pdf",
      file_name: "report.pdf",
      file_type: "file",
    },
  ];
  const article =
    await api.functional.economicPoliticalBoard.member.articles.create(
      memberLoginConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          sectionId: section.id,
          tags: tagsInput,
          attachments: attachments,
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 4. Validate article structure and data
  TestValidator.equals("section id matches", article.section.id, section.id);
  TestValidator.equals(
    "section name matches",
    article.section.name,
    section.name,
  );
  TestValidator.equals("comment count initialized", article.comment_count, 0);
  TestValidator.equals(
    "tags count matches",
    article.tags.length,
    tagsInput.length,
  );
  TestValidator.equals(
    "attachments count matches",
    article.attachments.length,
    attachments.length,
  );
  TestValidator.predicate(
    "author has display name",
    article.author.displayName.length > 0,
  );
  TestValidator.equals(
    "article title is non-empty",
    article.title.length,
    article.title.length > 0 ? article.title.length : 0,
  );
  TestValidator.equals(
    "article content is non-empty",
    article.content.length,
    article.content.length > 0 ? article.content.length : 0,
  );
  TestValidator.equals(
    "first attachment filename",
    article.attachments[0].fileName,
    attachments[0].file_name,
  );
  TestValidator.equals(
    "first attachment type",
    article.attachments[0].fileType,
    attachments[0].file_type,
  );
  TestValidator.equals(
    "second attachment filename",
    article.attachments[1].fileName,
    attachments[1].file_name,
  );
  TestValidator.equals(
    "second attachment type",
    article.attachments[1].fileType,
    attachments[1].file_type,
  );
}
