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

export async function test_api_guest_sections_list(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Unauthenticated request should succeed
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  const emptyList =
    await api.functional.economicPoliticalBoard.guest.sections.index(
      unauthenticatedConnection,
      { body: {} },
    );
  typia.assert(emptyList);
  TestValidator.equals(
    "empty list returns 200 OK with 0 records",
    emptyList.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty list has empty data array",
    emptyList.data.length,
    0,
  );
  TestValidator.equals(
    "pagination shows 0 pages for empty list",
    emptyList.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current defaults to 1",
    emptyList.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit defaults to 20",
    emptyList.pagination.limit,
    20,
  );
  // Test 2: Authenticated request also succeeds (backwards compatibility)
  const joinedUser = await authorize_guest_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IEconomicPoliticalBoardGuest.IJoin,
  });
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${joinedUser.token.access}` },
  };
  const authenticatedList =
    await api.functional.economicPoliticalBoard.guest.sections.index(
      authenticatedConnection,
      { body: {} },
    );
  typia.assert(authenticatedList);
  TestValidator.equals(
    "authenticated request succeeds",
    authenticatedList.pagination.records,
    emptyList.pagination.records,
  );
  // Test 3: Section list with custom pagination parameters
  const paginatedList =
    await api.functional.economicPoliticalBoard.guest.sections.index(
      authenticatedConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEconomicPoliticalBoardSection.IRequest,
      },
    );
  typia.assert(paginatedList);
  TestValidator.equals(
    "custom limit is respected",
    paginatedList.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page number is respected",
    paginatedList.pagination.current,
    1,
  );
  // Test 4: Section summary structure validation
  if (paginatedList.data.length > 0) {
    const section = paginatedList.data[0];
    typia.assert(section);
    TestValidator.predicate(
      "section id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        section.id,
      ),
    );
    TestValidator.predicate(
      "section name is non-empty string",
      typeof section.name === "string" && section.name.length > 0,
    );
    TestValidator.predicate(
      "section created_at is valid datetime",
      !isNaN(Date.parse(section.created_at)),
    );
    TestValidator.predicate(
      "section updated_at is valid datetime",
      !isNaN(Date.parse(section.updated_at)),
    );
    TestValidator.predicate(
      "section deleted_at is nullable datetime or null",
      section.deleted_at === null || !isNaN(Date.parse(section.deleted_at)),
    );
  }
  // Test 5: Alphabetical sorting by name
  const sortedList =
    await api.functional.economicPoliticalBoard.guest.sections.index(
      authenticatedConnection,
      {
        body: {
          sortBy: "name",
        } satisfies IEconomicPoliticalBoardSection.IRequest,
      },
    );
  typia.assert(sortedList);
  if (sortedList.data.length > 1) {
    for (let i = 1; i < sortedList.data.length; i++) {
      TestValidator.predicate(
        "sections are sorted alphabetically by name",
        sortedList.data[i - 1].name.localeCompare(sortedList.data[i].name) <= 0,
      );
    }
  }
  // Test 6: Search functionality
  const searchedList =
    await api.functional.economicPoliticalBoard.guest.sections.index(
      authenticatedConnection,
      {
        body: {
          search: "test",
        } satisfies IEconomicPoliticalBoardSection.IRequest,
      },
    );
  typia.assert(searchedList);
  TestValidator.predicate(
    "search results are filtered",
    searchedList.data.every((section) => section.name.includes("test")),
  );
  // Test 7: Oldest first sorting
  const oldestList =
    await api.functional.economicPoliticalBoard.guest.sections.index(
      authenticatedConnection,
      {
        body: {
          sortBy: "oldest",
        } satisfies IEconomicPoliticalBoardSection.IRequest,
      },
    );
  typia.assert(oldestList);
  if (oldestList.data.length > 1) {
    for (let i = 1; i < oldestList.data.length; i++) {
      TestValidator.predicate(
        "sections are sorted oldest first",
        new Date(oldestList.data[i - 1].created_at) <=
          new Date(oldestList.data[i].created_at),
      );
    }
  }
  // Test 8: Newest first sorting
  const newestList =
    await api.functional.economicPoliticalBoard.guest.sections.index(
      authenticatedConnection,
      {
        body: {
          sortBy: "newest",
        } satisfies IEconomicPoliticalBoardSection.IRequest,
      },
    );
  typia.assert(newestList);
  if (newestList.data.length > 1) {
    for (let i = 1; i < newestList.data.length; i++) {
      TestValidator.predicate(
        "sections are sorted newest first",
        new Date(newestList.data[i - 1].created_at) >=
          new Date(newestList.data[i].created_at),
      );
    }
  }
}
