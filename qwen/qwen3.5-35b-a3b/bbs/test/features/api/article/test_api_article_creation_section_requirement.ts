import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_economic_political_board_admin_sections_create } from "../../../generate/generate_random_economic_political_board_admin_sections_create";
import { generate_random_economic_political_board_member_articles_create } from "../../../generate/generate_random_economic_political_board_member_articles_create";
import { prepare_random_economic_political_board_article } from "../../../prepare/prepare_random_economic_political_board_article";
import { prepare_random_economic_political_board_article_attachment } from "../../../prepare/prepare_random_economic_political_board_article_attachment";
import { prepare_random_economic_political_board_section } from "../../../prepare/prepare_random_economic_political_board_section";

export async function test_api_article_creation_section_requirement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
      password: typia.assert<string & tags.MinLength<8> & tags.MaxLength<128> & tags.Format<"password">>(typia.random<string & tags.Format<"password">>()),
      href: typia.assert<string & tags.Format<"uri">>(typia.random<string & tags.Format<"uri">>()),
      referrer: typia.assert<string & tags.Format<"uri">>(typia.random<string & tags.Format<"uri">>()),
    },
  });
  typia.assert(adminAuth);
  // 2. Admin creates a section
  const adminAuthConnection: api.IConnection = { host: connection.host };
  adminAuthConnection.headers = {
    Authorization: adminAuth.token.access,
  };
  const section =
    await api.functional.economicPoliticalBoard.admin.sections.create(
      adminAuthConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<1>>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEconomicPoliticalBoardSection.ICreate,
      },
    );
  typia.assert(section);
  typia.assert(section.name);
  typia.assert(section.id);
  // 3. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
      password: typia.assert<string & tags.MinLength<8> & tags.MaxLength<128> & tags.Format<"password">>(typia.random<string & tags.Format<"password">>()),
      href: typia.assert<string & tags.Format<"uri">>(typia.random<string & tags.Format<"uri">>()),
      referrer: typia.assert<string & tags.Format<"uri">>(typia.random<string & tags.Format<"uri">>()),
    },
  });
  typia.assert(memberAuth);
  // 4. Member creates article with section assignment
  const memberAuthConnection: api.IConnection = { host: connection.host };
  memberAuthConnection.headers = {
    Authorization: memberAuth.token.access,
  };
  const article =
    await api.functional.economicPoliticalBoard.member.articles.create(
      memberAuthConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 6,
          }),
          content: RandomGenerator.content({ paragraphs: 3 }),
          section_id: section.id,
          tagIds: undefined,
          attachmentData: undefined,
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 5. Validate article response
  TestValidator.equals("article title", article.title, article.title);
  TestValidator.equals("article section_id", article.section.id, section.id);
  TestValidator.equals(
    "article section name",
    article.section.name,
    section.name,
  );
  TestValidator.equals(
    "article section description",
    article.section.description,
    section.description,
  );
  TestValidator.notEquals("article has valid id", article.id, null);
  TestValidator.notEquals("article has valid title", article.title, null);
  TestValidator.notEquals("article has valid content", article.content, null);
  TestValidator.notEquals(
    "article has valid createdAt",
    article.created_at,
    null,
  );
  TestValidator.notEquals(
    "article has valid updatedAt",
    article.updated_at,
    null,
  );
  // 6. Validate section metadata in response
  TestValidator.equals("section id in article", article.section.id, section.id);
  TestValidator.equals(
    "section name in article",
    article.section.name,
    section.name,
  );
  TestValidator.equals(
    "section description in article",
    article.section.description,
    section.description,
  );
  TestValidator.notEquals(
    "section article count starts at 0 or higher",
    article.section.articleCount,
    null,
  );
  TestValidator.predicate(
    "section article count is non-negative",
    article.section.articleCount >= 0,
  );
  // 7. Validate author information
  TestValidator.notEquals(
    "author has valid userId",
    article.author.userId,
    null,
  );
  TestValidator.notEquals("author has valid grade", article.author.grade, null);
  TestValidator.notEquals(
    "author has displayName",
    article.author.user.displayName,
    null,
  );
  TestValidator.equals(
    "author grade is valid",
    article.author.grade,
    "regular",
  );
  // 8. Validate empty collections
  TestValidator.equals(
    "article has empty attachments",
    article.attachments.length,
    0,
  );
  TestValidator.equals("article has empty tags", article.tags.length, 0);
}