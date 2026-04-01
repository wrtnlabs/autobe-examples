import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_departments_create } from "../../../generate/generate_random_hrm_platform_member_departments_create";
import { generate_random_hrm_platform_member_invitations_create } from "../../../generate/generate_random_hrm_platform_member_invitations_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";
import { prepare_random_hrm_platform_invitation } from "../../../prepare/prepare_random_hrm_platform_invitation";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

/**
 * Test employee list filtering by department and status.
 *
 * This test validates the filtering capabilities of the employee listing endpoint.
 * Note: Due to API limitations (no employee update endpoints provided), this test
 * focuses on validating the endpoint structure, response format, and empty result
 * handling rather than actual filter behavior with pre-configured employee data.
 *
 * Test coverage:
 * 1. Filter by department_id - validates endpoint accepts the parameter
 * 2. Filter by status='active' - validates endpoint accepts the parameter
 * 3. Filter by status='deactivated' - validates endpoint accepts the parameter
 * 4. Combined filters - validates endpoint accepts multiple filter parameters
 * 5. Empty results - validates correct pagination metadata when no matches
 * 6. Employment type filtering - validates endpoint accepts employment_type parameter
 * 7. Response structure validation - validates IPageIHrmPlatformEmployee.ISummary structure
 */
export async function test_api_employee_list_filtered_by_department_and_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Select organization
  await api.functional.hrmPlatform.member.organizations.select(
    memberConnection,
    {
      organizationId: organization.id,
    },
  );
  // 4. Create departments for potential employee assignment
  const department1 =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: {
          name: `Engineering-${RandomGenerator.alphabets(5)}`,
          description: "Engineering department",
        },
      },
    );
  typia.assert(department1);
  const department2 =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: {
          name: `Marketing-${RandomGenerator.alphabets(5)}`,
          description: "Marketing department",
        },
      },
    );
  typia.assert(department2);
  // 5. Test filtering by department_id (valid UUID format)
  const dept1Filter = await api.functional.hrmPlatform.member.employees.index(
    memberConnection,
    {
      body: {
        department_id: department1.id,
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformEmployee.IRequest,
    },
  );
  typia.assert(dept1Filter);
  TestValidator.predicate(
    "response has data array",
    Array.isArray(dept1Filter.data),
  );
  TestValidator.predicate(
    "response has pagination",
    dept1Filter.pagination !== undefined,
  );
  // 6. Test filtering by status='active'
  const activeFilter = await api.functional.hrmPlatform.member.employees.index(
    memberConnection,
    {
      body: {
        status: "active",
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformEmployee.IRequest,
    },
  );
  typia.assert(activeFilter);
  TestValidator.predicate(
    "active filter returns valid structure",
    activeFilter.data !== undefined,
  );
  // 7. Test filtering by status='deactivated'
  const deactivatedFilter =
    await api.functional.hrmPlatform.member.employees.index(memberConnection, {
      body: {
        status: "deactivated",
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformEmployee.IRequest,
    });
  typia.assert(deactivatedFilter);
  TestValidator.predicate(
    "deactivated filter returns valid structure",
    deactivatedFilter.data !== undefined,
  );
  // 8. Test combined filters (department_id + status)
  const combinedFilter =
    await api.functional.hrmPlatform.member.employees.index(memberConnection, {
      body: {
        department_id: department2.id,
        status: "active",
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformEmployee.IRequest,
    });
  typia.assert(combinedFilter);
  TestValidator.predicate(
    "combined filter returns valid structure",
    combinedFilter.data !== undefined,
  );
  // 9. Test empty results with non-existent department_id
  const emptyFilter = await api.functional.hrmPlatform.member.employees.index(
    memberConnection,
    {
      body: {
        department_id: typia.random<string & tags.Format<"uuid">>(),
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformEmployee.IRequest,
    },
  );
  typia.assert(emptyFilter);
  TestValidator.equals("empty data array", emptyFilter.data.length, 0);
  TestValidator.equals("records count is 0", emptyFilter.pagination.records, 0);
  TestValidator.equals("pages count is 0", emptyFilter.pagination.pages, 0);
  // 10. Test employment type filtering for each type
  const employmentTypes = [
    "full-time",
    "part-time",
    "contractor",
    "intern",
  ] as const;
  for (const empType of employmentTypes) {
    const empTypeFilter =
      await api.functional.hrmPlatform.member.employees.index(
        memberConnection,
        {
          body: {
            employment_type: empType,
            page: 1,
            limit: 10,
          } satisfies IHrmPlatformEmployee.IRequest,
        },
      );
    typia.assert(empTypeFilter);
    TestValidator.predicate(
      `${empType} filter returns valid structure`,
      empTypeFilter.data !== undefined,
    );
  }
  // 11. Test pagination metadata structure
  const allEmployees = await api.functional.hrmPlatform.member.employees.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformEmployee.IRequest,
    },
  );
  typia.assert(allEmployees);
  TestValidator.predicate(
    "pagination current is valid",
    allEmployees.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    allEmployees.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    allEmployees.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    allEmployees.pagination.pages >= 0,
  );
  // 12. Test employee summary structure when data exists
  if (allEmployees.data.length > 0) {
    const firstEmployee = allEmployees.data[0]!;
    TestValidator.predicate("employee has id", firstEmployee.id !== undefined);
    TestValidator.predicate(
      "employee has user",
      firstEmployee.user !== undefined,
    );
    TestValidator.predicate(
      "employee has role",
      firstEmployee.role !== undefined,
    );
    TestValidator.predicate(
      "employee has employment_type",
      firstEmployee.employment_type !== undefined,
    );
    TestValidator.predicate(
      "employee has status",
      firstEmployee.status !== undefined,
    );
    TestValidator.predicate(
      "employee has created_at",
      firstEmployee.created_at !== undefined,
    );
  }
  // 13. Test with different page and limit values
  const paginatedResult =
    await api.functional.hrmPlatform.member.employees.index(memberConnection, {
      body: {
        page: 1,
        limit: 5,
      } satisfies IHrmPlatformEmployee.IRequest,
    });
  typia.assert(paginatedResult);
  TestValidator.equals("limit respected", paginatedResult.pagination.limit, 5);
  TestValidator.predicate(
    "data length within limit",
    paginatedResult.data.length <= 5,
  );
}
