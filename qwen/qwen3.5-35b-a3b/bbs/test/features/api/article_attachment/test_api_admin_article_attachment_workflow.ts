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

export async function test_api_admin_article_attachment_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - store credentials first
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminDisplayName = RandomGenerator.name();
  // Admin join
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuth: IEconomicPoliticalBoardAdmin.IAuthorized =
    await authorize_admin_join(adminJoinConnection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        displayName: adminDisplayName,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(adminAuth);
  // Admin login for API operations
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEconomicPoliticalBoardAdmin.ILogin,
  });
  // Create section
  const section =
    await generate_random_economic_political_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(section);
  // 2. Member setup - store credentials first
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberName = RandomGenerator.name();
  // Member join
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const memberAuth: IEconomicPoliticalBoardMember.IAuthorized =
    await authorize_member_join(memberJoinConnection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        name: memberName,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(memberAuth);
  // Member login for API operations
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IEconomicPoliticalBoardMember.ILogin,
  });
  // Generate unique tags
  const tags: (string & tags.Pattern<"^[a-zA-Z0-9-]+$">)[] = ArrayUtil.repeat(
    3,
    () => RandomGenerator.alphabets(6),
  );
  // Member creates article
  const article =
    await generate_random_economic_political_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          sectionId: section.id,
          tags,
        },
      },
    );
  typia.assert(article);
  // 3. Admin adds first attachment - image type
  const attachment1 =
    await generate_random_economic_political_board_admin_articles_attachments_create(
      adminConnection,
      {
        body: {
          file_url: typia.random<string & tags.Format<"uri">>(),
          file_name: "economic-chart-2024.png",
          file_type: "image",
        },
        params: { articleId: article.id },
      },
    );
  typia.assert(attachment1);
  // Admin adds second attachment - file type
  const attachment2 =
    await generate_random_economic_political_board_admin_articles_attachments_create(
      adminConnection,
      {
        body: {
          file_url: typia.random<string & tags.Format<"uri">>(),
          file_name: "policy-report.pdf",
          file_type: "file",
        },
        params: { articleId: article.id },
      },
    );
  typia.assert(attachment2);
  // 4. Validate article includes both attachments
  // The article response should now include both attachments
  TestValidator.equals(
    "article should have 2 attachments",
    article.attachments.length,
    2,
  );
  // Verify both attachments are present with correct file types
  TestValidator.equals(
    "first attachment should be image type",
    attachment1.file_type,
    "image",
  );
  TestValidator.equals(
    "second attachment should be file type",
    attachment2.file_type,
    "file",
  );
  // Verify attachment IDs are unique
  TestValidator.notEquals(
    "attachments should have different IDs",
    attachment1.id,
    attachment2.id,
  );
  // Verify file names are preserved
  TestValidator.equals(
    "first attachment filename should match",
    attachment1.file_name,
    "economic-chart-2024.png",
  );
  TestValidator.equals(
    "second attachment filename should match",
    attachment2.file_name,
    "policy-report.pdf",
  );
  // Verify file URLs are set
  TestValidator.predicate(
    "first attachment should have valid file_url",
    () => attachment1.file_url.length > 0,
  );
  TestValidator.predicate(
    "second attachment should have valid file_url",
    () => attachment2.file_url.length > 0,
  );
  // Verify article metadata
  TestValidator.predicate(
    "article should have valid comment_count",
    () => article.comment_count >= 0,
  );
  // Verify timestamps are present
  TestValidator.predicate(
    "article should have valid created_at",
    () => article.created_at.length > 0,
  );
  TestValidator.predicate(
    "article should have valid updated_at",
    () => article.updated_at.length > 0,
  );
}