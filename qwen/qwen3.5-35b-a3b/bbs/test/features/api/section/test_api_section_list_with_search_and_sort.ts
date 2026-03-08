import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import type { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_economic_political_board_admin_sections_create } from "../../../generate/generate_random_economic_political_board_admin_sections_create";
import { prepare_random_economic_political_board_section } from "../../../prepare/prepare_random_economic_political_board_section";

export async function test_api_section_list_with_search_and_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string>() satisfies (string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string>() satisfies (string & tags.Format<"uri">),
      referrer: typia.random<string>() satisfies (string & tags.Format<"uri">),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Update admin connection with token
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminAuth.token.access;
  // 2. Create sections with different names
  const sections: IEconomicPoliticalBoardSection[] = [];
  const sectionNames = [
    "Economics",
    "Politics",
    "Current Affairs",
    "International Relations",
    "Local News",
  ];
  for (const name of sectionNames) {
    const section =
      await api.functional.economicPoliticalBoard.admin.sections.create(
        adminConnection,
        {
          body: {
            name: name,
            description: typia.random<string>() satisfies (string & tags.MaxLength<255>),
          } satisfies IEconomicPoliticalBoardSection.ICreate,
        },
      );
    typia.assert(section);
    sections.push(section);
  }
  // 3a. Basic pagination test: page=1, limit=3
  const basicPagination =
    await api.functional.economicPoliticalBoard.admin.sections.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 3,
        } satisfies IEconomicPoliticalBoardSection.IRequest,
      },
    );
  typia.assert(basicPagination);
  TestValidator.equals(
    "basic pagination current page",
    basicPagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "basic pagination limit",
    basicPagination.pagination.limit,
    3,
  );
  TestValidator.equals(
    "basic pagination total records",
    basicPagination.pagination.records,
    5,
  );
  TestValidator.equals(
    "basic pagination total pages",
    basicPagination.pagination.pages,
    2,
  );
  TestValidator.equals(
    "basic pagination data count",
    basicPagination.data.length,
    3,
  );
  // 3b. Sorting by name ascending test
  const sortByName =
    await api.functional.economicPoliticalBoard.admin.sections.index(
      adminConnection,
      {
        body: {
          sortBy: "name",
          sortOrder: "asc",
        } satisfies IEconomicPoliticalBoardSection.IRequest,
      },
    );
  typia.assert(sortByName);
  // Verify sections are sorted alphabetically by name (ascending)
  for (let i = 0; i < sortByName.data.length - 1; i++) {
    TestValidator.predicate(
      `sort by name: ${sortByName.data[i].name} <= ${sortByName.data[i + 1].name}`,
      sortByName.data[i].name <= sortByName.data[i + 1].name,
    );
  }
  // 3c. Search test: case-insensitive partial match
  const searchResult =
    await api.functional.economicPoliticalBoard.admin.sections.index(
      adminConnection,
      {
        body: {
          search: "Political",
        } satisfies IEconomicPoliticalBoardSection.IRequest,
      },
    );
  typia.assert(searchResult);
  // Verify only sections matching "Political" are returned
  for (const section of searchResult.data) {
    TestValidator.predicate(
      `search matches "Political" (case-insensitive)`,
      section.name.toLowerCase().includes("political"),
    );
  }
  TestValidator.equals("search result count", searchResult.data.length, 1);
  // 3d. Validate section summary contains only allowed fields
  for (const section of searchResult.data) {
    // Verify articleCount is a valid number
    TestValidator.predicate(
      "articleCount is non-negative",
      section.articleCount >= 0,
    );
    TestValidator.predicate(
      "articleCount is int32",
      Number.isInteger(section.articleCount),
    );
    // Verify no 'articles' field exists in summary
    TestValidator.equals(
      "section summary has no articles field",
      "articles" in section,
      false,
    );
  }
  // 4. Test pagination page=2 with limit=5
  const page2 =
    await api.functional.economicPoliticalBoard.admin.sections.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IEconomicPoliticalBoardSection.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 5);
  TestValidator.equals("page 2 total records", page2.pagination.records, 5);
  TestValidator.equals("page 2 total pages", page2.pagination.pages, 1);
  // 5. Test search with no matches
  const noMatchSearch =
    await api.functional.economicPoliticalBoard.admin.sections.index(
      adminConnection,
      {
        body: {
          search: "NonExistentSectionXYZ",
        } satisfies IEconomicPoliticalBoardSection.IRequest,
      },
    );
  typia.assert(noMatchSearch);
  TestValidator.equals("no match result count", noMatchSearch.data.length, 0);
  TestValidator.equals(
    "no match current page",
    noMatchSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "no match total records",
    noMatchSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "no match total pages",
    noMatchSearch.pagination.pages,
    0,
  );
}