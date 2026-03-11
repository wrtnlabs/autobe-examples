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
import { generate_random_economic_political_board_member_articles_create } from "../../../generate/generate_random_economic_political_board_member_articles_create";
import { prepare_random_economic_political_board_article } from "../../../prepare/prepare_random_economic_political_board_article";
import { prepare_random_economic_political_board_attachment } from "../../../prepare/prepare_random_economic_political_board_attachment";

export async function test_api_admin_article_attachment_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminDisplayName = RandomGenerator.name();
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      displayName: adminDisplayName,
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // 2. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberName = RandomGenerator.name();
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      name: memberName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  typia.assert(memberAuthorized);
  // 3. Member creates article
  const article =
    await generate_random_economic_political_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          tags: ArrayUtil.repeat(3, () =>
            typia.random<string & tags.Pattern<"^[a-zA-Z0-9-]+$">>(),
          ),
        },
      },
    );
  typia.assert(article);
  // 4. Admin adds image attachment to member's article
  const imageAttachment =
    await generate_random_economic_political_board_admin_articles_attachments_create(
      adminConnection,
      {
        params: {
          articleId: article.id,
        },
        body: {
          file_url: typia.random<string & tags.Format<"uri">>(),
          file_name: "chart.png",
          file_type: "image",
        },
      },
    );
  typia.assert(imageAttachment);
  // 5. Validate image attachment metadata
  TestValidator.equals(
    "attachment id exists",
    imageAttachment.id !== undefined,
    true,
  );
  TestValidator.equals(
    "attachment file_name",
    imageAttachment.file_name,
    "chart.png",
  );
  TestValidator.equals(
    "attachment file_type is image",
    imageAttachment.file_type,
    "image",
  );
  TestValidator.equals(
    "attachment articleId matches",
    imageAttachment.article.id,
    article.id,
  );
  TestValidator.predicate(
    "attachment has created_at",
    imageAttachment.created_at !== undefined,
  );
  // 6. Admin adds document attachment
  const documentAttachment =
    await generate_random_economic_political_board_admin_articles_attachments_create(
      adminConnection,
      {
        params: {
          articleId: article.id,
        },
        body: {
          file_url: typia.random<string & tags.Format<"uri">>(),
          file_name: "report.pdf",
          file_type: "file",
        },
      },
    );
  typia.assert(documentAttachment);
  // 7. Validate document attachment
  TestValidator.equals(
    "document file_type is file",
    documentAttachment.file_type,
    "file",
  );
  TestValidator.equals(
    "document articleId matches",
    documentAttachment.article.id,
    article.id,
  );
  // 8. Verify admin can attach to any article (cross-article capability)
  const anotherArticle =
    await generate_random_economic_political_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.content({ paragraphs: 1 }),
        },
      },
    );
  typia.assert(anotherArticle);
  const anotherAttachment =
    await generate_random_economic_political_board_admin_articles_attachments_create(
      adminConnection,
      {
        params: {
          articleId: anotherArticle.id,
        },
        body: {
          file_url: typia.random<string & tags.Format<"uri">>(),
          file_name: "image.jpg",
          file_type: "image",
        },
      },
    );
  typia.assert(anotherAttachment);
  TestValidator.equals(
    "admin attaches to different article",
    anotherAttachment.article.id,
    anotherArticle.id,
  );
}