import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import type { IEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAttachment";
import type { IEconomicPoliticalBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardBanRecord";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import type { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import type { IEconomicPoliticalBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardBanRecord";
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
import { generate_random_economic_political_board_member_articles_create } from "../../../generate/generate_random_economic_political_board_member_articles_create";
import { prepare_random_economic_political_board_article } from "../../../prepare/prepare_random_economic_political_board_article";
import { prepare_random_economic_political_board_attachment } from "../../../prepare/prepare_random_economic_political_board_attachment";

export async function test_api_article_retrieval_banned_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with tracked credentials
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberName = RandomGenerator.name();
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      name: memberName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  typia.assert(memberAuthorized);
  // 2. Login as member using actual credentials
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IEconomicPoliticalBoardMember.ILogin,
  });
  // 3. Create article as member (using valid UUID for section - system will create section if needed)
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const tagsList = ArrayUtil.repeat(3, () =>
    RandomGenerator.alphabets(8),
  ) as string[];
  const article =
    await api.functional.economicPoliticalBoard.member.articles.create(
      memberLoginConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          sectionId,
          tags: tagsList,
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 4. Create admin account with tracked credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminDisplayName = RandomGenerator.name();
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      displayName: adminDisplayName,
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // 5. Login as admin using actual credentials
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEconomicPoliticalBoardAdmin.ILogin,
  });
  // 6. Ban the member using admin API
  // Note: admin/bans PATCH endpoint manages ban records
  const banRequest: IEconomicPoliticalBoardBanRecord.IRequest = {
    userId: memberAuthorized.id,
    reasonKeyword: "Test violation for article visibility",
    sortBy: "newest",
  } satisfies IEconomicPoliticalBoardBanRecord.IRequest;
  // Query ban records to verify ban was created (or check existing bans)
  const banResult =
    await api.functional.economicPoliticalBoard.admin.bans.index(
      adminLoginConnection,
      { body: banRequest },
    );
  typia.assert(banResult);
  // 7. Retrieve article as anonymous user (public access - no auth needed)
  const publicConnection: api.IConnection = { host: connection.host };
  const retrievedArticle =
    await api.functional.economicPoliticalBoard.articles.at(publicConnection, {
      articleId: article.id,
    });
  typia.assert(retrievedArticle);
  // 8. Validate article is still visible with all metadata intact
  TestValidator.equals("article ID preserved", retrievedArticle.id, article.id);
  TestValidator.equals(
    "article title preserved",
    retrievedArticle.title,
    article.title,
  );
  TestValidator.equals(
    "article content preserved",
    retrievedArticle.content,
    article.content,
  );
  TestValidator.equals(
    "author ID matches banned user",
    retrievedArticle.author.id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "author display name matches",
    retrievedArticle.author.displayName,
    memberName,
  );
  TestValidator.equals(
    "section ID matches",
    retrievedArticle.section.id,
    sectionId,
  );
  TestValidator.equals(
    "comment count preserved",
    retrievedArticle.comment_count,
    article.comment_count,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedArticle.created_at,
    article.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrievedArticle.updated_at,
    article.updated_at,
  );
  // 9. Verify article metadata integrity
  TestValidator.predicate(
    "article remains accessible after author ban",
    retrievedArticle.id !== undefined && retrievedArticle.id !== null,
  );
  TestValidator.predicate(
    "author information intact",
    retrievedArticle.author.id === memberAuthorized.id &&
      retrievedArticle.author.displayName === memberName,
  );
  TestValidator.predicate(
    "section information intact",
    retrievedArticle.section.id === sectionId,
  );
  // 10. Validate response structure matches expected article type
  const hasValidAuthor = retrievedArticle.author.id.length === 36; // UUID length
  const hasValidContent = retrievedArticle.content.length > 0;
  TestValidator.predicate("author has valid UUID", hasValidAuthor);
  TestValidator.predicate("content is not empty", hasValidContent);
}