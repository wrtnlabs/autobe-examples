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

export async function test_api_article_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup: create section for article
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    } satisfies IEconomicPoliticalBoardAdmin.ILogin,
  });
  const section =
    await generate_random_economic_political_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
        },
      },
    );
  typia.assert(section);
  // 2. Member setup: register and login
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  const memberConnectionAuthenticated: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuth.token.access,
    },
  };
  // 3. Create article with initial data
  const initialTitle = RandomGenerator.paragraph({ sentences: 3 });
  const initialContent = RandomGenerator.paragraph({ sentences: 10 });
  const article =
    await generate_random_economic_political_board_member_articles_create(
      memberConnectionAuthenticated,
      {
        body: {
          title: initialTitle,
          content: initialContent,
          section_id: section.id,
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  const createdAt = article.created_at;
  const initialSectionId = article.section.id;
  // 4. Update article: change title and content
  const updatedTitle = RandomGenerator.paragraph({ sentences: 4 });
  const updatedContent = RandomGenerator.paragraph({ sentences: 15 });
  const updatedArticle =
    await api.functional.economicPoliticalBoard.member.articles.update(
      memberConnectionAuthenticated,
      {
        articleId: article.id,
        body: {
          title: updatedTitle,
          content: updatedContent,
        } satisfies IEconomicPoliticalBoardArticle.IUpdate,
      },
    );
  typia.assert(updatedArticle);
  const updatedAt = updatedArticle.updated_at;
  // 5. Validate updates
  TestValidator.equals("title updated", updatedArticle.title, updatedTitle);
  TestValidator.equals(
    "content updated",
    updatedArticle.content,
    updatedContent,
  );
  TestValidator.notEquals("updated_at changed", createdAt, updatedAt);
  TestValidator.equals(
    "section_id preserved",
    updatedArticle.section.id,
    initialSectionId,
  );
}
