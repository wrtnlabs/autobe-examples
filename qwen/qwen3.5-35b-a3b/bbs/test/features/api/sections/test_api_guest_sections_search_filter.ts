import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardGuest";
import type { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_sections_search_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a guest user for authentication (required by scenario)
  const userConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_guest_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardGuest.IJoin,
  });
  typia.assert(authResponse);
  // 2. Create authorized user connection for testing search
  const testUserConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${authResponse.token.access}` },
  };
  // 3. Test case-insensitive search with partial match
  const generalSearch =
    await api.functional.economicPoliticalBoard.guest.sections.index(
      testUserConnection,
      {
        body: {
          search: "General",
          sortBy: "name",
        } satisfies IEconomicPoliticalBoardSection.IRequest,
      },
    );
  typia.assert(generalSearch);
  TestValidator.equals(
    "general search finds matching sections",
    generalSearch.data.some((s) => s.name.toLowerCase().includes("general")),
    true,
  );
  TestValidator.notEquals(
    "general search returns results",
    generalSearch.data.length,
    0,
  );
  // 4. Test sorting by newest
  const newestSort =
    await api.functional.economicPoliticalBoard.guest.sections.index(
      testUserConnection,
      {
        body: {
          sortBy: "newest",
          limit: 100,
        } satisfies IEconomicPoliticalBoardSection.IRequest,
      },
    );
  typia.assert(newestSort);
  TestValidator.predicate(
    "newest sort verified - first item created_at >= second item",
    () => {
      if (newestSort.data.length < 2) return true;
      const first = new Date(newestSort.data[0].created_at).getTime();
      const second = new Date(newestSort.data[1].created_at).getTime();
      return first >= second;
    },
  );
  // 5. Test sorting by oldest
  const oldestSort =
    await api.functional.economicPoliticalBoard.guest.sections.index(
      testUserConnection,
      {
        body: {
          sortBy: "oldest",
          limit: 100,
        } satisfies IEconomicPoliticalBoardSection.IRequest,
      },
    );
  typia.assert(oldestSort);
  TestValidator.predicate(
    "oldest sort verified - first item created_at <= second item",
    () => {
      if (oldestSort.data.length < 2) return true;
      const first = new Date(oldestSort.data[0].created_at).getTime();
      const second = new Date(oldestSort.data[1].created_at).getTime();
      return first <= second;
    },
  );
  // 6. Test custom page size with limit=5
  const limitedResults =
    await api.functional.economicPoliticalBoard.guest.sections.index(
      testUserConnection,
      {
        body: {
          limit: 5,
          sortBy: "name",
        } satisfies IEconomicPoliticalBoardSection.IRequest,
      },
    );
  typia.assert(limitedResults);
  TestValidator.equals(
    "limit parameter caps results",
    limitedResults.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "results do not exceed limit",
    () => limitedResults.data.length <= 5,
  );
  // 7. Test pagination with page=2
  const page2Results =
    await api.functional.economicPoliticalBoard.guest.sections.index(
      testUserConnection,
      {
        body: {
          page: 2,
          limit: 2,
          sortBy: "name",
        } satisfies IEconomicPoliticalBoardSection.IRequest,
      },
    );
  typia.assert(page2Results);
  TestValidator.equals(
    "page parameter sets current page",
    page2Results.pagination.current,
    2,
  );
  // 8. Test empty search results
  const emptySearch =
    await api.functional.economicPoliticalBoard.guest.sections.index(
      testUserConnection,
      {
        body: {
          search: "NonExistentSection12345",
          sortBy: "name",
        } satisfies IEconomicPoliticalBoardSection.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty search returns 0 records",
    emptySearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search returns 0 pages",
    emptySearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search returns empty data array",
    emptySearch.data.length,
    0,
  );
  // 9. Test case-insensitive search with Political
  const politicalSearch =
    await api.functional.economicPoliticalBoard.guest.sections.index(
      testUserConnection,
      {
        body: {
          search: "Political",
          sortBy: "name",
        } satisfies IEconomicPoliticalBoardSection.IRequest,
      },
    );
  typia.assert(politicalSearch);
  TestValidator.equals(
    "political search is case insensitive",
    politicalSearch.data.every((s) =>
      s.name.toLowerCase().includes("political"),
    ),
    true,
  );
}