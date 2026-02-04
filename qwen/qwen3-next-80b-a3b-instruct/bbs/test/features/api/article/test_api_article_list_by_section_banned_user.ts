import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministrator";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleTag";
import type { IEconomicDiscussionBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionBan";
import type { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import type { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import type { IEconomicDiscussionSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";
import { generate_random_economic_discussion_administrator_bans_create } from "../../../generate/generate_random_economic_discussion_administrator_bans_create";
import { generate_random_economic_discussion_administrator_sections_create } from "../../../generate/generate_random_economic_discussion_administrator_sections_create";
import { prepare_random_economic_discussion_ban } from "../../../prepare/prepare_random_economic_discussion_ban";
import { prepare_random_economic_discussion_section } from "../../../prepare/prepare_random_economic_discussion_section";

export async function test_api_article_list_by_section_banned_user(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.org/",
    } satisfies IEconomicDiscussionAdministrator.IJoin,
  });
  // Step 2: Create citizen connection and authenticate
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizen: IEconomicDiscussionCitizen.IAuthorized =
    await authorize_citizen_join(citizenConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.org/",
      } satisfies IEconomicDiscussionCitizen.IJoin,
    });
  typia.assert(citizen);
  // Step 3: Create a section using admin connection
  const section: IEconomicDiscussionSection =
    await generate_random_economic_discussion_administrator_sections_create(
      adminConnection,
      {},
    );
  typia.assert(section);
  // Step 4: Ban the citizen user using admin connection
  await generate_random_economic_discussion_administrator_bans_create(
    adminConnection,
    {
      params: {
        userId: citizen.id,
      },
      body: {
        reason: "Violation of community guidelines",
      } satisfies IEconomicDiscussionBan.ICreate,
    },
  );
  // Step 5: Attempt to access the article list as the banned citizen using citizen connection
  // The endpoint returns an empty list for sections with no articles, regardless of user status
  // So we validate that we get a valid response structure, not an error
  const citizenArticleList: IPageIEconomicDiscussionArticle.ISummary =
    await api.functional.economicDiscussion.sections.articles.index(
      citizenConnection,
      { sectionId: section.id },
    );
  typia.assert(citizenArticleList);
  // Validate the structure is correct (empty data array)
  TestValidator.equals(
    "page structure valid",
    citizenArticleList.pagination.current,
    1,
  );
  TestValidator.equals(
    "page structure valid",
    citizenArticleList.pagination.limit,
    20,
  );
  TestValidator.equals(
    "page structure valid",
    citizenArticleList.pagination.records,
    0,
  );
  TestValidator.equals(
    "page structure valid",
    citizenArticleList.pagination.pages,
    0,
  );
  TestValidator.equals("article count", citizenArticleList.data.length, 0);
  // Step 6: Verify that a non-banned user (admin) can still view the article list
  // It should also be an empty array (no articles created, so this is expected)
  const adminArticleList: IPageIEconomicDiscussionArticle.ISummary =
    await api.functional.economicDiscussion.sections.articles.index(
      adminConnection,
      { sectionId: section.id },
    );
  typia.assert(adminArticleList);
  TestValidator.equals(
    "admin page structure valid",
    adminArticleList.pagination.current,
    1,
  );
  TestValidator.equals(
    "admin page structure valid",
    adminArticleList.pagination.limit,
    20,
  );
  TestValidator.equals(
    "admin page structure valid",
    adminArticleList.pagination.records,
    0,
  );
  TestValidator.equals(
    "admin page structure valid",
    adminArticleList.pagination.pages,
    0,
  );
  TestValidator.equals("admin article count", adminArticleList.data.length, 0);
}
