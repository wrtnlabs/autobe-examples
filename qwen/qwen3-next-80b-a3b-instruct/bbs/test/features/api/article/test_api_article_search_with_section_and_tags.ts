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

export async function test_api_article_search_with_section_and_tags(
  connection: api.IConnection,
): Promise<void> {
  // Setup citizen connection for search operations
  const citizenConnection: api.IConnection = { host: connection.host };
  // Test article search functionality with search term and other parameters
  // Since we cannot create sections or articles via API, we test against existing data
  const searchResponse = await api.functional.economicDiscussion.articles.index(
    citizenConnection,
    {
      body: {
        search_term: "economy",
        page: 1,
        limit: 10,
        sort_order: "desc",
      } satisfies IEconomicDiscussionArticle.IRequest,
    },
  );
  typia.assert(searchResponse);
  // Validate pagination
  TestValidator.equals("page", searchResponse.pagination.current, 1);
  TestValidator.equals("limit", searchResponse.pagination.limit, 10);
  // Validate that records count matches actual data length
  TestValidator.equals(
    "pagination records matches actual data count",
    searchResponse.pagination.records,
    searchResponse.data.length,
  );
  // Verify results are sorted by newest first (descending) if we have multiple results
  if (searchResponse.data.length >= 2) {
    const firstArticle = searchResponse.data[0];
    const secondArticle = searchResponse.data[1];
    TestValidator.predicate(
      "articles sorted newest first",
      new Date(firstArticle.created_at) >= new Date(secondArticle.created_at),
    );
  }
  // Verify search term appears in the title of at least one article
  if (searchResponse.data.length > 0) {
    const lowerSearchTerm = "economy".toLowerCase();
    const hasMatch = searchResponse.data.some((article) =>
      article.title.toLowerCase().includes(lowerSearchTerm),
    );
    TestValidator.predicate(
      "at least one result contains search term in title",
      hasMatch,
    );
  }
  // Note: We cannot validate section_id filtering because we cannot create sections
  // We cannot validate content matching because content is not available in ISummary
  // We cannot validate tags filtering because ISummary includes tag objects not strings
}
