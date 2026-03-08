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

export async function test_api_article_update_deletion_protection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  const memberLogin = await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IEconomicPoliticalBoardMember.ILogin,
  });
  typia.assert(memberLogin);
  const memberAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${memberLogin.token.access}` },
  };
  // 2. Admin creates section
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail satisfies string as string &
        tags.MinLength<1> &
        tags.MaxLength<255> &
        tags.Format<"email">,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  const adminLogin = await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEconomicPoliticalBoardAdmin.ILogin,
  });
  typia.assert(adminLogin);
  const adminAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${adminLogin.token.access}` },
  };
  const section =
    await api.functional.economicPoliticalBoard.admin.sections.create(
      adminAuthConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEconomicPoliticalBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Member creates article
  const article =
    await api.functional.economicPoliticalBoard.member.articles.create(
      memberAuthConnection,
      {
        body: {
          title: RandomGenerator.name(3),
          content: RandomGenerator.content({ paragraphs: 3 }),
          section_id: section.id,
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 4. Member deletes article
  await api.functional.economicPoliticalBoard.member.articles.erase(
    memberAuthConnection,
    {
      articleId: article.id,
    },
  );
  // 5. Attempt to update deleted article - should return 404
  await TestValidator.error("deleted article cannot be updated", async () => {
    await api.functional.economicPoliticalBoard.member.articles.update(
      memberAuthConnection,
      {
        articleId: article.id,
        body: {
          title: RandomGenerator.name(3),
        } satisfies IEconomicPoliticalBoardArticle.IUpdate,
      },
    );
  });
}
