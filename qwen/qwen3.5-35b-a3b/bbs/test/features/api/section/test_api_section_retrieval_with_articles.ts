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

export async function test_api_section_retrieval_with_articles(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin Setup
  const adminEmail = typia.random<string & tags.Format<"email">>() as string &
    tags.MinLength<1> &
    tags.MaxLength<255> &
    tags.Format<"email">;
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: "http://test.local/admin/join",
      referrer: "http://test.local/admin",
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(adminJoin);
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEconomicPoliticalBoardAdmin.ILogin,
  });
  // 2. Admin creates section
  const section =
    await api.functional.economicPoliticalBoard.admin.sections.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEconomicPoliticalBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: "http://test.local/member/join",
      referrer: "http://test.local/member",
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  // 4. Member creates multiple articles in the section
  const article1 =
    await api.functional.economicPoliticalBoard.member.articles.create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.name() + " Article 1",
          content: RandomGenerator.paragraph({ sentences: 3 }),
          section_id: section.id,
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(article1);
  const article2 =
    await api.functional.economicPoliticalBoard.member.articles.create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.name() + " Article 2",
          content: RandomGenerator.paragraph({ sentences: 3 }),
          section_id: section.id,
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(article2);
  const article3 =
    await api.functional.economicPoliticalBoard.member.articles.create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.name() + " Article 3",
          content: RandomGenerator.paragraph({ sentences: 3 }),
          section_id: section.id,
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(article3);
  // Wait briefly to ensure creation order is preserved
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 5. Retrieve section with articles
  const retrievedSection =
    await api.functional.economicPoliticalBoard.admin.sections.at(
      adminConnection,
      {
        sectionId: section.id,
      },
    );
  typia.assert(retrievedSection);
  // 6. Validate section metadata
  TestValidator.equals("section id matches", retrievedSection.id, section.id);
  TestValidator.equals(
    "section name matches",
    retrievedSection.name,
    section.name,
  );
  TestValidator.equals(
    "section description matches",
    retrievedSection.description,
    section.description,
  );
  TestValidator.predicate(
    "section has valid created_at",
    retrievedSection.created_at !== null &&
      retrievedSection.created_at !== undefined,
  );
  TestValidator.predicate(
    "section has valid updated_at",
    retrievedSection.updated_at !== null &&
      retrievedSection.updated_at !== undefined,
  );
  TestValidator.equals(
    "section is not soft-deleted",
    retrievedSection.deleted_at,
    null,
  );
  // 7. Validate articles array
  TestValidator.equals(
    "articles count matches",
    retrievedSection.articles.length,
    3,
  );
  TestValidator.predicate(
    "section has at least one article",
    retrievedSection.articles.length >= 1,
  );
  // 8. Validate articles are sorted by newest first (createdAt DESC)
  const articlesSorted = retrievedSection.articles;
  if (articlesSorted.length > 1) {
    for (let i = 0; i < articlesSorted.length - 1; i++) {
      const currentArticle = articlesSorted[i];
      const nextArticle = articlesSorted[i + 1];
      const currentCreatedAt = new Date(currentArticle.created_at);
      const nextCreatedAt = new Date(nextArticle.created_at);
      TestValidator.predicate(
        "articles sorted by newest first (index " + i + " to " + (i + 1) + ")",
        currentCreatedAt >= nextCreatedAt,
      );
    }
  }
  // 9. Validate each article in the articles array
  for (const article of retrievedSection.articles) {
    TestValidator.predicate(
      "article has valid id",
      article.id !== null && article.id !== undefined,
    );
    TestValidator.equals("article has title", typeof article.title, "string");
    TestValidator.predicate(
      "article has author",
      article.author !== null && article.author !== undefined,
    );
    TestValidator.predicate(
      "article has section",
      article.section !== null && article.section !== undefined,
    );
    TestValidator.equals(
      "article section_id matches",
      article.section.id,
      section.id,
    );
    TestValidator.predicate(
      "article has valid created_at",
      article.created_at !== null && article.created_at !== undefined,
    );
    TestValidator.equals(
      "article has updated_at",
      typeof article.updated_at,
      "string",
    );
    TestValidator.equals(
      "article deleted_at is null",
      article.deleted_at,
      null,
    );
  }
}
