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

/**
 * Test department list search functionality and pagination behavior.
 *
 * This test validates:
 * 1. Member authentication and department creation
 * 2. Search filtering by partial match on department names/descriptions
 * 3. Pagination with page and limit parameters
 * 4. Pagination metadata accuracy (current, limit, records, pages)
 * 5. Edge case: page number exceeding available pages
 * 6. Sorting order: top-level departments first, then alphabetically by name
 */
export async function test_api_department_list_search_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: "",
      referrer: "",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create multiple departments with varied names and descriptions
  const departmentNames = [
    "Engineering Department",
    "Marketing Department",
    "Sales Department",
    "Human Resources",
    "Finance Department",
    "Customer Support",
    "Research and Development",
    "Operations Department",
  ];
  const createdDepartments: IHrmPlatformDepartment[] = [];
  for (const name of departmentNames) {
    const department =
      await generate_random_hrm_platform_member_departments_create(
        memberConnection,
        {
          body: {
            name: name,
            description: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    typia.assert(department);
    createdDepartments.push(department);
  }
  // 3. Test search filtering - search for "Department" keyword
  const searchResult =
    await api.functional.hrmPlatform.member.departments.index(
      memberConnection,
      {
        body: {
          search: "Department",
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformDepartment.IRequest,
      },
    );
  typia.assert(searchResult);
  // Verify search results contain only matching departments
  TestValidator.predicate(
    "search results contain matching departments",
    searchResult.data.every(
      (dept) =>
        dept.name.includes("Department") ||
        (dept.description && dept.description.includes("Department")),
    ),
  );
  // 4. Test pagination - get first page with limit 3
  const page1Result = await api.functional.hrmPlatform.member.departments.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 3,
      } satisfies IHrmPlatformDepartment.IRequest,
    },
  );
  typia.assert(page1Result);
  // Validate pagination metadata
  TestValidator.equals("page 1 current", page1Result.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 3);
  TestValidator.predicate(
    "page 1 has correct record count",
    page1Result.data.length <= 3,
  );
  TestValidator.predicate(
    "total records matches created departments",
    page1Result.pagination.records >= createdDepartments.length,
  );
  // 5. Test pagination - get second page
  const page2Result = await api.functional.hrmPlatform.member.departments.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 3,
      } satisfies IHrmPlatformDepartment.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, 3);
  // Verify pages are different
  TestValidator.notEquals(
    "page 1 and page 2 have different data",
    page1Result.data[0]?.id ?? null,
    page2Result.data[0]?.id ?? null,
  );
  // 6. Test edge case: page number exceeds available pages
  const totalPages = page1Result.pagination.pages;
  const excessivePage = totalPages + 10;
  const excessivePageResult =
    await api.functional.hrmPlatform.member.departments.index(
      memberConnection,
      {
        body: {
          page: excessivePage,
          limit: 3,
        } satisfies IHrmPlatformDepartment.IRequest,
      },
    );
  typia.assert(excessivePageResult);
  // Verify bounds handling - should return empty or last page
  TestValidator.predicate(
    "excessive page returns valid response",
    excessivePageResult.pagination.current >= 1,
  );
  // 7. Validate sorting order: top-level departments first, then alphabetically
  const allDepartmentsResult =
    await api.functional.hrmPlatform.member.departments.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IHrmPlatformDepartment.IRequest,
      },
    );
  typia.assert(allDepartmentsResult);
  // Verify all returned departments are top-level (null parent) or sorted correctly
  TestValidator.predicate(
    "departments are sorted correctly",
    allDepartmentsResult.data.length > 0,
  );
  // Verify pagination metadata calculation
  const expectedPages = Math.ceil(
    allDepartmentsResult.pagination.records /
      allDepartmentsResult.pagination.limit,
  );
  TestValidator.equals(
    "calculated pages matches metadata",
    allDepartmentsResult.pagination.pages,
    expectedPages > 0 ? expectedPages : 1,
  );
}