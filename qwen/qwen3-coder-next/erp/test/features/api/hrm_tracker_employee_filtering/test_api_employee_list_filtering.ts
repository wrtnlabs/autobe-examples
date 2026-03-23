import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerDepartment";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_departments_create } from "../../../generate/generate_random_hrm_tracker_member_departments_create";
import { generate_random_hrm_tracker_member_employees_create } from "../../../generate/generate_random_hrm_tracker_member_employees_create";
import { prepare_random_hrm_tracker_department } from "../../../prepare/prepare_random_hrm_tracker_department";
import { prepare_random_hrm_tracker_employee } from "../../../prepare/prepare_random_hrm_tracker_employee";

export async function test_api_employee_list_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create actor-specific connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.hrmTracker.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        phone: null,
      } satisfies IHrmTrackerMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create organization for the member
  const organization =
    await api.functional.hrmTracker.member.organizations.update(
      memberConnection,
      {
        organizationId: member.id,
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmTrackerOrganization.IUpdate,
      },
    );
  typia.assert(organization);
  // 3. Select organization context
  await api.functional.hrmTracker.member.organizations.update(
    memberConnection,
    {
      organizationId: organization.id,
      body: {
        name: organization.name,
      } satisfies IHrmTrackerOrganization.IUpdate,
    },
  );
  // 4. Create departments for testing
  const departmentA = await api.functional.hrmTracker.member.departments.create(
    memberConnection,
    {
      body: {
        name: "Engineering",
        description: "Development team",
        parent_id: null,
      } satisfies IHrmTrackerDepartment.ICreate,
    },
  );
  typia.assert(departmentA);
  const departmentB = await api.functional.hrmTracker.member.departments.create(
    memberConnection,
    {
      body: {
        name: "Marketing",
        description: "Marketing team",
        parent_id: null,
      } satisfies IHrmTrackerDepartment.ICreate,
    },
  );
  typia.assert(departmentB);
  // 5. Create multiple employees with varying attributes
  const employees: IHrmTrackerEmployee[] = [];
  // Create active full-time employees
  const emp1 = await api.functional.hrmTracker.member.employees.create(
    memberConnection,
    {
      body: {
        user_id: typia.random<string & tags.Format<"uuid">>(),
        organization_id: organization.id,
        employment_type: "full-time",
        status: "active",
        position: "Senior Engineer",
        department_id: departmentA.id,
        role_id: null,
      } satisfies IHrmTrackerEmployee.ICreate,
    },
  );
  employees.push(emp1);
  typia.assert(emp1);
  const emp2 = await api.functional.hrmTracker.member.employees.create(
    memberConnection,
    {
      body: {
        user_id: typia.random<string & tags.Format<"uuid">>(),
        organization_id: organization.id,
        employment_type: "full-time",
        status: "active",
        position: "Engineer",
        department_id: departmentA.id,
        role_id: null,
      } satisfies IHrmTrackerEmployee.ICreate,
    },
  );
  employees.push(emp2);
  typia.assert(emp2);
  // Create deactivated part-time employees
  const emp3 = await api.functional.hrmTracker.member.employees.create(
    memberConnection,
    {
      body: {
        user_id: typia.random<string & tags.Format<"uuid">>(),
        organization_id: organization.id,
        employment_type: "part-time",
        status: "deactivated",
        position: "Marketing Specialist",
        department_id: departmentB.id,
        role_id: null,
      } satisfies IHrmTrackerEmployee.ICreate,
    },
  );
  employees.push(emp3);
  typia.assert(emp3);
  const emp4 = await api.functional.hrmTracker.member.employees.create(
    memberConnection,
    {
      body: {
        user_id: typia.random<string & tags.Format<"uuid">>(),
        organization_id: organization.id,
        employment_type: "contractor",
        status: "active",
        position: "Marketing Consultant",
        department_id: departmentB.id,
        role_id: null,
      } satisfies IHrmTrackerEmployee.ICreate,
    },
  );
  employees.push(emp4);
  typia.assert(emp4);
  // Create intern in Engineering department
  const emp5 = await api.functional.hrmTracker.member.employees.create(
    memberConnection,
    {
      body: {
        user_id: typia.random<string & tags.Format<"uuid">>(),
        organization_id: organization.id,
        employment_type: "intern",
        status: "active",
        position: "Engineering Intern",
        department_id: departmentA.id,
        role_id: null,
      } satisfies IHrmTrackerEmployee.ICreate,
    },
  );
  employees.push(emp5);
  typia.assert(emp5);
  // 6. Test single status filter
  const activeFilter = await api.functional.hrmTracker.employees.index(
    memberConnection,
    {
      body: {
        status: "active",
        department_id: typia.random<string & tags.Format<"uuid">>(),
        employment_type: "full-time",
        position: "Engineer",
        cursor: "0",
        limit: 10,
      } satisfies IHrmTrackerEmployee.IRequest,
    },
  );
  typia.assert(activeFilter);
  TestValidator.equals(
    "status filter returns only active employees",
    activeFilter.data.length,
    3,
  );
  // 7. Test department filter
  const departmentFilter = await api.functional.hrmTracker.employees.index(
    memberConnection,
    {
      body: {
        status: "active",
        department_id: departmentA.id,
        employment_type: "full-time",
        position: "Engineer",
        cursor: "0",
        limit: 10,
      } satisfies IHrmTrackerEmployee.IRequest,
    },
  );
  typia.assert(departmentFilter);
  TestValidator.equals(
    "department filter returns only Engineering employees",
    departmentFilter.data.length,
    2,
  );
  // 8. Test employment type filter
  const partTimeFilter = await api.functional.hrmTracker.employees.index(
    memberConnection,
    {
      body: {
        status: "deactivated",
        department_id: typia.random<string & tags.Format<"uuid">>(),
        employment_type: "part-time",
        position: "Engineer",
        cursor: "0",
        limit: 10,
      } satisfies IHrmTrackerEmployee.IRequest,
    },
  );
  typia.assert(partTimeFilter);
  TestValidator.equals(
    "employment type filter returns only part-time employees",
    partTimeFilter.data.length,
    1,
  );
  // 9. Test position partial match filter
  const positionFilter = await api.functional.hrmTracker.employees.index(
    memberConnection,
    {
      body: {
        status: "active",
        department_id: typia.random<string & tags.Format<"uuid">>(),
        employment_type: "full-time",
        position: "Engineer",
        cursor: "0",
        limit: 10,
      } satisfies IHrmTrackerEmployee.IRequest,
    },
  );
  typia.assert(positionFilter);
  TestValidator.predicate(
    "position filter matches Engineer-related positions",
    positionFilter.data.every((emp) =>
      emp.position?.toLowerCase().includes("engineer"),
    ),
  );
  // 10. Test combined filters
  const combinedFilter = await api.functional.hrmTracker.employees.index(
    memberConnection,
    {
      body: {
        status: "active",
        department_id: departmentA.id,
        employment_type: "full-time",
        position: "Senior",
        cursor: "0",
        limit: 10,
      } satisfies IHrmTrackerEmployee.IRequest,
    },
  );
  typia.assert(combinedFilter);
  TestValidator.equals(
    "combined filters return correct count",
    combinedFilter.data.length,
    1,
  );
  // 11. Test empty result
  const emptyFilter = await api.functional.hrmTracker.employees.index(
    memberConnection,
    {
      body: {
        status: "active",
        department_id: departmentA.id,
        employment_type: "intern",
        position: "CEO",
        cursor: "0",
        limit: 10,
      } satisfies IHrmTrackerEmployee.IRequest,
    },
  );
  typia.assert(emptyFilter);
  TestValidator.equals("no matching results", emptyFilter.data.length, 0);
  // 12. Test pagination
  const paginatedFilter = await api.functional.hrmTracker.employees.index(
    memberConnection,
    {
      body: {
        status: "active",
        department_id: typia.random<string & tags.Format<"uuid">>(),
        employment_type: "full-time",
        position: "Engineer",
        cursor: "0",
        limit: 2,
      } satisfies IHrmTrackerEmployee.IRequest,
    },
  );
  typia.assert(paginatedFilter);
  TestValidator.equals(
    "pagination limit respected",
    paginatedFilter.data.length,
    2,
  );
  TestValidator.predicate(
    "pagination has correct metadata",
    () =>
      paginatedFilter.pagination.current === 1 &&
      paginatedFilter.pagination.limit === 2,
  );
}
