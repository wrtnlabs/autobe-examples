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

export async function test_api_article_search_with_only_tags(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as administrator to create section
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicDiscussionAdministrator.IJoin,
  });
  // Step 2: Create a section for article categorization
  const section =
    await generate_random_economic_discussion_administrator_sections_create(
      adminConnection,
      {},
    );
  // Step 3: Authenticate as citizen to prepare for search
  const citizenConnection: api.IConnection = { host: connection.host };
  await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicDiscussionCitizen.IJoin,
  });
  // Step 4: Generate tag values to search for (no articles exist in system)
  const tag1 = typia.random<string & tags.MinLength<1> & tags.MaxLength<50>>();
  const tag2 = typia.random<string & tags.MinLength<1> & tags.MaxLength<50>>();
  // Step 5: Search articles with only tag filters (search_term empty)
  // On an empty system, this should return empty data array
  const searchResult = await api.functional.economicDiscussion.articles.index(
    citizenConnection,
    {
      body: {
        search_term: "", // Empty search term with tag filters
        tag_filters: [tag1, tag2], // Must match articles with BOTH tags
      },
    },
  );
  // Step 6: Validate that search returns empty array of articles (which is correct)
  TestValidator.equals(
    "response contains pagination information",
    searchResult.pagination,
    {
      current: 1,
      limit: 20,
      records: 0,
      pages: 0,
    },
  );
  TestValidator.equals("no articles returned", searchResult.data.length, 0);
  // Step 7: Test that search with empty search_term and empty tag_filters is rejected
  await TestValidator.error(
    "empty search_term with empty tag_filters must fail",
    async () => {
      await api.functional.economicDiscussion.articles.index(
        citizenConnection,
        {
          body: {
            search_term: "",
            // Empty array for tag_filters violates MinLength<1> constraint
            tag_filters: [],
          },
        },
      );
    },
  );
  // Step 8: Test that search with zero length search_term and no tag_filters is valid
  // (should return empty array as no articles exist)
  const searchResultWithNoTags =
    await api.functional.economicDiscussion.articles.index(citizenConnection, {
      body: {
        search_term: "", // No tag_filters property provided
      },
    });
  TestValidator.equals(
    "response contains pagination information when no tag_filters",
    searchResultWithNoTags.pagination,
    {
      current: 1,
      limit: 20,
      records: 0,
      pages: 0,
    },
  );
  TestValidator.equals(
    "no articles returned when no tag_filters",
    searchResultWithNoTags.data.length,
    0,
  );
}
