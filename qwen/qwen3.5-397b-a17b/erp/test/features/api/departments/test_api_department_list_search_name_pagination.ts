import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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
import { generate_random_hrm_platform_member_departments_create } from "../../../generate/generate_random_hrm_platform_member_departments_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";

export async function test_api_department_list_search_name_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create multiple departments with distinct names for testing
  const engineeringDept =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: {
          name: "Engineering",
          description: "Engineering department",
        },
      },
    );
  typia.assert(engineeringDept);
  const engineeringOpsDept =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: {
          name: "Engineering Operations",
          description: "Engineering operations sub-department",
        },
      },
    );
  typia.assert(engineeringOpsDept);
  const marketingDept =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: {
          name: "Marketing",
          description: "Marketing department",
        },
      },
    );
  typia.assert(marketingDept);
  const salesDept =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: {
          name: "Sales",
          description: "Sales department",
        },
      },
    );
  typia.assert(salesDept);
  // 3. Test partial name search for 'Engineering'
  const engineeringSearchResult =
    await api.functional.hrmPlatform.member.departments.index(
      memberConnection,
      {
        body: {
          search: "Engineering",
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformDepartment.IRequest,
      },
    );
  typia.assert(engineeringSearchResult);
  // Validate search results contain both Engineering departments
  TestValidator.predicate(
    "Engineering search returns results",
    engineeringSearchResult.data.length >= 2,
  );
  const engineeringNames = engineeringSearchResult.data.map((d) => d.name);
  TestValidator.predicate(
    "Engineering search includes 'Engineering'",
    engineeringNames.includes("Engineering"),
  );
  TestValidator.predicate(
    "Engineering search includes 'Engineering Operations'",
    engineeringNames.includes("Engineering Operations"),
  );
  TestValidator.predicate(
    "Engineering search excludes 'Marketing'",
    !engineeringNames.includes("Marketing"),
  );
  TestValidator.predicate(
    "Engineering search excludes 'Sales'",
    !engineeringNames.includes("Sales"),
  );
  // 4. Test case-insensitive search with lowercase 'engineering'
  const lowercaseSearchResult =
    await api.functional.hrmPlatform.member.departments.index(
      memberConnection,
      {
        body: {
          search: "engineering",
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformDepartment.IRequest,
      },
    );
  typia.assert(lowercaseSearchResult);
  const lowercaseNames = lowercaseSearchResult.data.map((d) => d.name);
  TestValidator.predicate(
    "Case-insensitive search includes 'Engineering'",
    lowercaseNames.includes("Engineering"),
  );
  TestValidator.predicate(
    "Case-insensitive search includes 'Engineering Operations'",
    lowercaseNames.includes("Engineering Operations"),
  );
  // 5. Test pagination with limit=2
  const paginatedResult =
    await api.functional.hrmPlatform.member.departments.index(
      memberConnection,
      {
        body: {
          search: "Engineering",
          page: 1,
          limit: 2,
        } satisfies IHrmPlatformDepartment.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // Validate pagination metadata
  TestValidator.equals(
    "Pagination current page",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals("Pagination limit", paginatedResult.pagination.limit, 2);
  TestValidator.predicate(
    "Pagination records count correct",
    paginatedResult.pagination.records >= 2,
  );
  TestValidator.predicate(
    "Pagination pages calculated correctly",
    paginatedResult.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "Pagination data length matches limit",
    paginatedResult.data.length <= 2,
  );
  // 6. Test second page of pagination
  const page2Result = await api.functional.hrmPlatform.member.departments.index(
    memberConnection,
    {
      body: {
        search: "Engineering",
        page: 2,
        limit: 2,
      } satisfies IHrmPlatformDepartment.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals(
    "Page 2 current page",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals("Page 2 limit", page2Result.pagination.limit, 2);
  // 7. Test edge case: search with no matching results
  const noResultsSearch =
    await api.functional.hrmPlatform.member.departments.index(
      memberConnection,
      {
        body: {
          search: "NonExistentDepartmentXYZ",
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformDepartment.IRequest,
      },
    );
  typia.assert(noResultsSearch);
  TestValidator.equals(
    "No results search returns empty array",
    noResultsSearch.data.length,
    0,
  );
  TestValidator.equals(
    "No results search records count",
    noResultsSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "No results search pages count",
    noResultsSearch.pagination.pages,
    0,
  );
}
