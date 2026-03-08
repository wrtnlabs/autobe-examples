import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import type { IEconomicPoliticalBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticleAttachment";
import type { IEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAttachment";
import type { IEconomicPoliticalBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardBanRecord";
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
import { generate_random_economic_political_board_admin_ban_records_create } from "../../../generate/generate_random_economic_political_board_admin_ban_records_create";
import { generate_random_economic_political_board_admin_sections_create } from "../../../generate/generate_random_economic_political_board_admin_sections_create";
import { generate_random_economic_political_board_member_articles_create } from "../../../generate/generate_random_economic_political_board_member_articles_create";
import { prepare_random_economic_political_board_article } from "../../../prepare/prepare_random_economic_political_board_article";
import { prepare_random_economic_political_board_article_attachment } from "../../../prepare/prepare_random_economic_political_board_article_attachment";
import { prepare_random_economic_political_board_ban_record } from "../../../prepare/prepare_random_economic_political_board_ban_record";
import { prepare_random_economic_political_board_section } from "../../../prepare/prepare_random_economic_political_board_section";

export async function test_api_tag_articles_banned_user_exclusion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication and setup
  const adminEmail = typia.random<string & tags.Format<"email">>() satisfies string as string;
  const adminPassword = "Admin123!";
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com/admin/join",
      referrer: "https://example.com",
    },
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  // 2. Admin creates a section for articles
  const section =
    await api.functional.economicPoliticalBoard.admin.sections.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: "Test section for banned user article exclusion",
        } satisfies IEconomicPoliticalBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Member 1 joins and creates article with tags
  const member1Email = typia.random<string & tags.Format<"email">>() satisfies string as string;
  const member1Password = "Member123!";
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {
    body: {
      email: member1Email,
      password: member1Password,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://example.com/member1/join",
      referrer: "https://example.com",
    },
  });
  await authorize_member_login(member1Connection, {
    body: {
      email: member1Email,
      password: member1Password,
    },
  });
  const member1TagId = typia.random<string & tags.Format<"uuid">>();
  const member1Article =
    await api.functional.economicPoliticalBoard.member.articles.create(
      member1Connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
          section_id: section.id,
          tagIds: [member1TagId],
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(member1Article);
  // 4. Member 2 joins and creates article with same tag
  const member2Email = typia.random<string & tags.Format<"email">>() satisfies string as string;
  const member2Password = "Member123!";
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {
    body: {
      email: member2Email,
      password: member2Password,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://example.com/member2/join",
      referrer: "https://example.com",
    },
  });
  await authorize_member_login(member2Connection, {
    body: {
      email: member2Email,
      password: member2Password,
    },
  });
  const member2Article =
    await api.functional.economicPoliticalBoard.member.articles.create(
      member2Connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
          section_id: section.id,
          tagIds: [member1TagId],
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(member2Article);
  // 5. Admin bans member 2
  const banRecord =
    await api.functional.economicPoliticalBoard.admin.ban_records.create(
      adminConnection,
      {
        body: {
          user_id: member2Article.author.id,
          reason: "Test ban for article exclusion verification",
        } satisfies IEconomicPoliticalBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // 6. Query tag endpoint for articles
  const tagArticles =
    await api.functional.economicPoliticalBoard.tags.articles.index(
      connection,
      {
        tagId: member1TagId,
        body: {},
      },
    );
  typia.assert(tagArticles);
  // 7. Verify banned user article is excluded from tag results
  TestValidator.equals("tag articles data length", tagArticles.data.length, 1);
  TestValidator.equals(
    "tag articles total records",
    tagArticles.pagination.records,
    1,
  );
  const visibleArticle = tagArticles.data[0];
  TestValidator.equals(
    "visible article author is unbanned user",
    visibleArticle.author.id,
    member1Article.author.id,
  );
  TestValidator.notEquals(
    "banned user article excluded",
    visibleArticle.author.id,
    member2Article.author.id,
  );
}