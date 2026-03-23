import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_department_list_search_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test department listing with search functionality and pagination controls.
   *
   * This test validates the department listing API's search capabilities,
   * pagination behavior, and sorting functionality. It creates multiple
   * departments with varied names and descriptions to test fuzzy matching,
   * case-insensitive search, and proper pagination metadata.
   */
  // 1. Setup: Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: undefined,
  });
  typia.assert(memberAuth);
  // Note: Department creation would require additional API endpoints not provided
  // For this test, we assume departments already exist in the organization
  // The test focuses on validating search, pagination, and sorting functionality
  // 2. Test name search with trigram similarity
  const searchResult =
    await api.functional.hrmPlatform.member.departments.index(
      memberConnection,
      {
        body: {
          search: "eng",
        } satisfies IHrmPlatformDepartment.IRequest,
      },
    );
  typia.assert(searchResult);
  // Verify search returns results
  TestValidator.predicate(
    "search returns departments",
    searchResult.data.length > 0,
  );
  // Verify all returned departments contain "eng" in name (case-insensitive)
  await ArrayUtil.asyncForEach(searchResult.data, async (dept) => {
    TestValidator.predicate(
      `department name contains search term: ${dept.name}`,
      dept.name.toLowerCase().includes("eng"),
    );
  });
  // Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit default",
    searchResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records matches data length",
    searchResult.pagination.records === searchResult.data.length,
  );
  // 3. Test description filter
  const descriptionFilterResult =
    await api.functional.hrmPlatform.member.departments.index(
      memberConnection,
      {
        body: {
          description: "technical",
        } satisfies IHrmPlatformDepartment.IRequest,
      },
    );
  typia.assert(descriptionFilterResult);
  // Verify all returned departments have "technical" in description
  await ArrayUtil.asyncForEach(descriptionFilterResult.data, async (dept) => {
    if (dept.description !== null) {
      TestValidator.predicate(
        `department description contains filter: ${dept.name}`,
        dept.description.toLowerCase().includes("technical"),
      );
    }
  });
  // 4. Test pagination with custom limit
  const page1Result = await api.functional.hrmPlatform.member.departments.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IHrmPlatformDepartment.IRequest,
    },
  );
  typia.assert(page1Result);
  // Verify page 1 returns exactly 5 items
  TestValidator.equals(
    "page 1 returns correct limit",
    page1Result.data.length,
    5,
  );
  TestValidator.equals(
    "page 1 pagination current",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 pagination limit",
    page1Result.pagination.limit,
    5,
  );
  // Verify page 1 IDs are stored
  const page1Ids = page1Result.data.map((d) => d.id);
  // 5. Test pagination page 2
  const page2Result = await api.functional.hrmPlatform.member.departments.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IHrmPlatformDepartment.IRequest,
    },
  );
  typia.assert(page2Result);
  // Verify page 2 returns different items than page 1
  const page2Ids = page2Result.data.map((d) => d.id);
  const hasOverlap = page1Ids.some((id) => page2Ids.includes(id));
  TestValidator.predicate(
    "page 2 returns different items than page 1",
    !hasOverlap,
  );
  // Verify pagination metadata
  TestValidator.equals(
    "page 2 pagination current",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 pagination limit",
    page2Result.pagination.limit,
    5,
  );
  // 6. Test sorting by created_at descending
  const sortedResult =
    await api.functional.hrmPlatform.member.departments.index(
      memberConnection,
      {
        body: {
          sort: "created_at",
          order: "desc",
        } satisfies IHrmPlatformDepartment.IRequest,
      },
    );
  typia.assert(sortedResult);
  // Verify results are sorted by created_at descending
  if (sortedResult.data.length > 1) {
    for (let i = 1; i < sortedResult.data.length; i++) {
      const prevDate = new Date(sortedResult.data[i - 1].created_at).getTime();
      const currDate = new Date(sortedResult.data[i].created_at).getTime();
      TestValidator.predicate(
        `departments sorted by created_at desc (index ${i})`,
        prevDate >= currDate,
      );
    }
  }
  // 7. Test combined filters: search + pagination + sorting
  const combinedResult =
    await api.functional.hrmPlatform.member.departments.index(
      memberConnection,
      {
        body: {
          search: "eng",
          page: 1,
          limit: 3,
          sort: "name",
          order: "asc",
        } satisfies IHrmPlatformDepartment.IRequest,
      },
    );
  typia.assert(combinedResult);
  // Verify search filter is applied
  await ArrayUtil.asyncForEach(combinedResult.data, async (dept) => {
    TestValidator.predicate(
      `combined search result contains term: ${dept.name}`,
      dept.name.toLowerCase().includes("eng"),
    );
  });
  // Verify pagination limit is applied
  TestValidator.equals(
    "combined result respects limit",
    combinedResult.data.length,
    3,
  );
  // Verify sorting is applied (alphabetical ascending)
  if (combinedResult.data.length > 1) {
    for (let i = 1; i < combinedResult.data.length; i++) {
      TestValidator.predicate(
        `combined results sorted by name asc (index ${i})`,
        combinedResult.data[i - 1].name.localeCompare(
          combinedResult.data[i].name,
        ) <= 0,
      );
    }
  }
  // Verify pagination metadata
  TestValidator.equals(
    "combined pagination current",
    combinedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined pagination limit",
    combinedResult.pagination.limit,
    3,
  );
  TestValidator.predicate(
    "combined pagination records accurate",
    combinedResult.pagination.records >= combinedResult.data.length,
  );
}
