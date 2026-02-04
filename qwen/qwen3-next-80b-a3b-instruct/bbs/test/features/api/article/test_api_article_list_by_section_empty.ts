import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministrator";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleTag";
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
import { generate_random_economic_discussion_administrator_sections_create } from "../../../generate/generate_random_economic_discussion_administrator_sections_create";
import { prepare_random_economic_discussion_section } from "../../../prepare/prepare_random_economic_discussion_section";

export async function test_api_article_list_by_section_empty(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_administrator_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies IEconomicDiscussionAdministrator.IJoin,
  });
  // Step 2: Create a section using the authenticated admin connection
  // Note: ICreate is empty, so pass {} explicitly
  const section: IEconomicDiscussionSection =
    await generate_random_economic_discussion_administrator_sections_create(
      adminConnection,
      {},
    );
  // Step 3: Create citizen connection for accessing the section
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizenEmail = typia.random<string & tags.Format<"email">>();
  const citizenPassword = RandomGenerator.alphaNumeric(16);
  await authorize_citizen_join(citizenConnection, {
    body: {
      email: citizenEmail,
      password: citizenPassword,
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies IEconomicDiscussionCitizen.IJoin,
  });
  // Step 4: Retrieve article list for the empty section
  const articleList: IPageIEconomicDiscussionArticle.ISummary =
    await api.functional.economicDiscussion.sections.articles.index(
      citizenConnection,
      {
        sectionId: section.id,
      },
    );
  // Step 5: Validate the response
  typia.assert(articleList);
  // Verify pagination metadata for empty results
  TestValidator.equals(
    "page count should be 0",
    articleList.pagination.pages,
    0,
  );
  TestValidator.equals(
    "record count should be 0",
    articleList.pagination.records,
    0,
  );
  TestValidator.equals(
    "current page should be 1",
    articleList.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be default",
    articleList.pagination.limit,
    20,
  );
  // Verify data array is empty
  TestValidator.equals(
    "data array should be empty",
    articleList.data.length,
    0,
  );
}
