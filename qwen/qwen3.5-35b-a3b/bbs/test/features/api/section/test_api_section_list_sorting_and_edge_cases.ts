import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
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

export async function test_api_section_list_sorting_and_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16) satisfies string as string & tags.MinLength<8> & tags.MaxLength<128> & tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>() satisfies string as string & tags.Format<"uri">,
      referrer: typia.random<string & tags.Format<"uri">>() satisfies string as string & tags.Format<"uri">,
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Re-create connection with admin token
  const adminTokenConnection: api.IConnection = { host: connection.host };
  adminTokenConnection.headers = { Authorization: adminAuth.token.access };
  // 2. Test sorting by created_at ascending (oldest to newest)
  const sortedByDateAsc =
    await api.functional.economicPoliticalBoard.admin.sections.index(
      adminTokenConnection,
      {
        body: {
          sortBy: "created_at",
          sortOrder: "asc",
          limit: 100,
        },
      },
    );
  typia.assert(sortedByDateAsc);
  // Verify sections are sorted by created_at ascending
  if (sortedByDateAsc.data.length >= 2) {
    TestValidator.predicate(
      "sections sorted by created_at ascending",
      sortedByDateAsc.data.every((section, index, arr) => {
        if (index === 0) return true;
        return (
          new Date(section.created_at) >= new Date(arr[index - 1].created_at)
        );
      }),
    );
  }
  // 3. Test sorting by name descending (Z before A)
  const sortedByNameDesc =
    await api.functional.economicPoliticalBoard.admin.sections.index(
      adminTokenConnection,
      {
        body: {
          sortBy: "name",
          sortOrder: "desc",
          limit: 100,
        },
      },
    );
  typia.assert(sortedByNameDesc);
  // Verify sections are sorted by name descending
  if (sortedByNameDesc.data.length >= 2) {
    TestValidator.predicate(
      "sections sorted by name descending",
      sortedByNameDesc.data.every((section, index, arr) => {
        if (index === 0) return true;
        return section.name.localeCompare(arr[index - 1].name) <= 0;
      }),
    );
  }
  // 4. Test empty search results
  const emptySearch =
    await api.functional.economicPoliticalBoard.admin.sections.index(
      adminTokenConnection,
      {
        body: {
          search: "NonExistentSectionName123",
          limit: 20,
        },
      },
    );
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty search returns no records",
    emptySearch.data.length,
    0,
  );
  TestValidator.equals(
    "empty search records count",
    emptySearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search pages count",
    emptySearch.pagination.pages,
    0,
  );
  // 5. Test with large limit (100)
  const largeLimit =
    await api.functional.economicPoliticalBoard.admin.sections.index(
      adminTokenConnection,
      {
        body: {
          limit: 100,
        },
      },
    );
  typia.assert(largeLimit);
  TestValidator.equals(
    "large limit returns correct pagination",
    largeLimit.pagination.limit,
    100,
  );
  // 6. Test with minimum limit (1)
  const minLimit =
    await api.functional.economicPoliticalBoard.admin.sections.index(
      adminTokenConnection,
      {
        body: {
          limit: 1,
        },
      },
    );
  typia.assert(minLimit);
  TestValidator.equals(
    "minimum limit returns correct pagination",
    minLimit.pagination.limit,
    1,
  );
  // 7. Test page parameter
  const page1 =
    await api.functional.economicPoliticalBoard.admin.sections.index(
      adminTokenConnection,
      {
        body: {
          page: 1,
          limit: 2,
        },
      },
    );
  typia.assert(page1);
  TestValidator.equals(
    "page 1 returns correct pagination",
    page1.pagination.current,
    1,
  );
  const page2 =
    await api.functional.economicPoliticalBoard.admin.sections.index(
      adminTokenConnection,
      {
        body: {
          page: 2,
          limit: 2,
        },
      },
    );
  typia.assert(page2);
  TestValidator.equals(
    "page 2 returns correct pagination",
    page2.pagination.current,
    2,
  );
  // 8. Verify section response structure
  if (largeLimit.data.length > 0) {
    const section = largeLimit.data[0];
    typia.assert(section);
    TestValidator.predicate(
      "section has valid id (UUID format)",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        section.id,
      ),
    );
    TestValidator.predicate(
      "section has non-empty name",
      section.name.length > 0,
    );
    TestValidator.predicate(
      "section has valid articleCount (non-negative integer)",
      section.articleCount >= 0 && Number.isInteger(section.articleCount),
    );
    TestValidator.predicate(
      "section has valid created_at (ISO 8601 format)",
      !isNaN(new Date(section.created_at).getTime()),
    );
  }
  // 9. Test that pagination metadata is consistent
  TestValidator.equals(
    "pagination calculates pages correctly",
    largeLimit.pagination.pages,
    Math.ceil(largeLimit.pagination.records / largeLimit.pagination.limit),
  );
}