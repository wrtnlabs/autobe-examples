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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardArticle";
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

export async function test_api_tag_articles_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinOutput = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: (typia.random<string & tags.Format<"email">>() as string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>),
      password: "admin1234",
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin",
      ip: "127.0.0.1",
    },
  });
  typia.assert(adminJoinOutput);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLoginOutput = await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminJoinOutput.id as string & tags.Format<"email">,
      password: "admin1234",
    },
  });
  typia.assert(adminLoginOutput);
  // 2. Admin creates a section
  const section =
    await api.functional.economicPoliticalBoard.admin.sections.create(
      adminLoginConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(section);
  // 3. Create member account
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const memberJoinOutput = await authorize_member_join(memberJoinConnection, {
    body: {
      email: (typia.random<string & tags.Format<"email">>() as string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>),
      password: "member1234",
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://example.com/member/join",
      referrer: "https://example.com/member",
      ip: "127.0.0.1",
    },
  });
  typia.assert(memberJoinOutput);
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberJoinOutput.id as string & tags.Format<"email">,
      password: "member1234",
    },
  });
  // 4. Create an article with tags
  const article =
    await api.functional.economicPoliticalBoard.member.articles.create(
      memberLoginConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          section_id: section.id,
          tagIds: [typia.random<string & tags.Format<"uuid">>()],
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 5. Retrieve articles by tag
  const response =
    await api.functional.economicPoliticalBoard.tags.articles.index(
      connection,
      {
        tagId: article.tags[0].id,
        body: {
          page: 1,
          pageSize: 20,
        },
      },
    );
  typia.assert(response);
  // 6. Validate response structure
  TestValidator.equals("article count", response.data.length, 1);
  TestValidator.equals("current page", response.pagination.current, 1);
  TestValidator.equals("limit", response.pagination.limit, 20);
  TestValidator.equals("records", response.pagination.records, 1);
  TestValidator.equals("pages", response.pagination.pages, 1);
  const articleSummary = response.data[0];
  typia.assert(articleSummary);
  // Validate article summary fields
  TestValidator.equals("article id matches", articleSummary.id, article.id);
  TestValidator.equals(
    "article title matches",
    articleSummary.title,
    article.title,
  );
  TestValidator.equals(
    "author id matches",
    articleSummary.author.id,
    article.author.id,
  );
  TestValidator.equals(
    "section id matches",
    articleSummary.section.id,
    section.id,
  );
  TestValidator.equals(
    "created_at matches",
    articleSummary.created_at,
    article.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    articleSummary.updated_at,
    article.updated_at,
  );
  TestValidator.equals("deleted_at is null", articleSummary.deleted_at, null);
  // Validate author summary structure
  TestValidator.equals(
    "author has display name",
    articleSummary.author.user.displayName.length > 0,
    true,
  );
  TestValidator.equals(
    "author grade is valid",
    ["regular", "super"].includes(articleSummary.author.grade),
    true,
  );
  // Validate section summary structure
  TestValidator.equals(
    "section has name",
    articleSummary.section.name.length > 0,
    true,
  );
  TestValidator.equals(
    "section article count is 1",
    articleSummary.section.articleCount,
    1,
  );
}