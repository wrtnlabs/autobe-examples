import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_track_member_departments_create } from "../../../generate/generate_random_hrm_time_track_member_departments_create";
import { generate_random_hrm_time_track_member_employees_create } from "../../../generate/generate_random_hrm_time_track_member_employees_create";
import { prepare_random_hrm_time_track_department } from "../../../prepare/prepare_random_hrm_time_track_department";
import { prepare_random_hrm_time_track_employee } from "../../../prepare/prepare_random_hrm_time_track_employee";

/**
 * Test employee list retrieval with multiple filter combinations.
 *
 * Validates the employee list endpoint with various filter scenarios including department, employment type, status, and search queries. Ensures that filters work independently and can be combined with AND logic. Tests edge cases such as employees without department assignments and search functionality.
 *
 * Special attention is given to verifying that filters correctly narrow results, null department values are handled gracefully, and multiple filters can be combined effectively.
 *
 * 1. Authenticate as a member using authorize_member_join utility
 * 2. Create a department for testing department-based filtering
 * 3. Create multiple employees with varying attributes:
 *    - Different employment types (full-time, part-time, contractor, intern)
 *    - Different statuses (active, deactivated)
 *    - Different department assignments (some with department, some without)
 * 4. Test various filter combinations:
 *    - Filter by departmentId only
 *    - Filter by employmentType only (e.g., full-time)
 *    - Filter by status only (e.g., active)
 *    - Filter by search query (employee name)
 *    - Combine multiple filters (department + employment type + status)
 * 5. Verify each filter correctly narrows the results
 * 6. Verify employees without department assignments appear when department filter is not applied
 * 7. Verify search functionality matches against employee names
 */
export async function test_api_employee_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authResult);
  const memberId = authResult.id;
  // 2. Create a department for testing
  const department =
    await generate_random_hrm_time_track_member_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(department);
  // 3. Create multiple employees with varying attributes
  // Note: Each employee needs a unique member, so we create separate member accounts
  const employees: IHrmTimeTrackEmployee[] = [];
  // Create member for employee 1
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member1);
  // Employee 1: full-time, active, with department
  const employee1 =
    await generate_random_hrm_time_track_member_employees_create(
      memberConnection,
      {
        body: {
          position: RandomGenerator.paragraph({ sentences: 2 }),
          employment_type: "full-time",
          status: "active",
          hire_date: new Date().toISOString(),
          hrm_time_track_department_id: department.id,
          hrm_time_track_member_id: member1.id,
        } satisfies IHrmTimeTrackEmployee.ICreate,
      },
    );
  typia.assert(employee1);
  employees.push(employee1);
  // Create member for employee 2
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member2);
  // Employee 2: part-time, active, with department
  const employee2 =
    await generate_random_hrm_time_track_member_employees_create(
      memberConnection,
      {
        body: {
          position: RandomGenerator.paragraph({ sentences: 2 }),
          employment_type: "part-time",
          status: "active",
          hire_date: new Date().toISOString(),
          hrm_time_track_department_id: department.id,
          hrm_time_track_member_id: member2.id,
        } satisfies IHrmTimeTrackEmployee.ICreate,
      },
    );
  typia.assert(employee2);
  employees.push(employee2);
  // Create member for employee 3
  const member3Connection: api.IConnection = { host: connection.host };
  const member3 = await authorize_member_join(member3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member3);
  // Employee 3: contractor, deactivated, without department
  const employee3 =
    await generate_random_hrm_time_track_member_employees_create(
      memberConnection,
      {
        body: {
          position: RandomGenerator.paragraph({ sentences: 2 }),
          employment_type: "contractor",
          status: "deactivated",
          hire_date: new Date().toISOString(),
          hrm_time_track_member_id: member3.id,
        } satisfies IHrmTimeTrackEmployee.ICreate,
      },
    );
  typia.assert(employee3);
  employees.push(employee3);
  // Create member for employee 4
  const member4Connection: api.IConnection = { host: connection.host };
  const member4 = await authorize_member_join(member4Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member4);
  // Employee 4: intern, active, without department
  const employee4 =
    await generate_random_hrm_time_track_member_employees_create(
      memberConnection,
      {
        body: {
          position: RandomGenerator.paragraph({ sentences: 2 }),
          employment_type: "intern",
          status: "active",
          hire_date: new Date().toISOString(),
          hrm_time_track_member_id: member4.id,
        } satisfies IHrmTimeTrackEmployee.ICreate,
      },
    );
  typia.assert(employee4);
  employees.push(employee4);
  // 4. Test various filter combinations
  // 4.1. Filter by departmentId only
  const filteredByDepartment =
    await api.functional.hrmTimeTrack.member.employees.index(memberConnection, {
      body: {
        departmentId: department.id,
      } satisfies IHrmTimeTrackEmployee.IRequest,
    });
  typia.assert(filteredByDepartment);
  TestValidator.equals(
    "department filter returns only employees with department",
    filteredByDepartment.data.length,
    2,
  );
  TestValidator.predicate(
    "all filtered employees have the correct department",
    filteredByDepartment.data.every(
      (emp) => emp.department?.id === department.id,
    ),
  );
  // 4.2. Filter by employmentType only (full-time)
  const filteredByEmploymentType =
    await api.functional.hrmTimeTrack.member.employees.index(memberConnection, {
      body: {
        employmentType: "full-time",
      } satisfies IHrmTimeTrackEmployee.IRequest,
    });
  typia.assert(filteredByEmploymentType);
  TestValidator.equals(
    "employment type filter returns only full-time employees",
    filteredByEmploymentType.data.length,
    1,
  );
  TestValidator.predicate(
    "all filtered employees are full-time",
    filteredByEmploymentType.data.every(
      (emp) => emp.employment_type === "full-time",
    ),
  );
  // 4.3. Filter by status only (active)
  const filteredByStatus =
    await api.functional.hrmTimeTrack.member.employees.index(memberConnection, {
      body: {
        status: "active",
      } satisfies IHrmTimeTrackEmployee.IRequest,
    });
  typia.assert(filteredByStatus);
  TestValidator.equals(
    "status filter returns only active employees",
    filteredByStatus.data.length,
    3,
  );
  TestValidator.predicate(
    "all filtered employees are active",
    filteredByStatus.data.every((emp) => emp.status === "active"),
  );
  // 4.4. Filter by search query (employee name)
  const searchQuery = employee1.member.email.split("@")[0];
  const filteredBySearch =
    await api.functional.hrmTimeTrack.member.employees.index(memberConnection, {
      body: {
        search: searchQuery,
      } satisfies IHrmTimeTrackEmployee.IRequest,
    });
  typia.assert(filteredBySearch);
  TestValidator.predicate(
    "search filter returns employees matching query",
    filteredBySearch.data.length > 0,
  );
  // 4.5. Combine multiple filters (department + employment type + status)
  const filteredByMultiple =
    await api.functional.hrmTimeTrack.member.employees.index(memberConnection, {
      body: {
        departmentId: department.id,
        employmentType: "full-time",
        status: "active",
      } satisfies IHrmTimeTrackEmployee.IRequest,
    });
  typia.assert(filteredByMultiple);
  TestValidator.equals(
    "combined filters return only matching employees",
    filteredByMultiple.data.length,
    1,
  );
  TestValidator.predicate(
    "combined filter results match all criteria",
    filteredByMultiple.data.every(
      (emp) =>
        emp.department?.id === department.id &&
        emp.employment_type === "full-time" &&
        emp.status === "active",
    ),
  );
  // 5. Verify employees without department assignments appear when department filter is not applied
  const allEmployees = await api.functional.hrmTimeTrack.member.employees.index(
    memberConnection,
    {
      body: {} satisfies IHrmTimeTrackEmployee.IRequest,
    },
  );
  typia.assert(allEmployees);
  TestValidator.equals(
    "all employees are returned without department filter",
    allEmployees.data.length,
    4,
  );
  TestValidator.predicate(
    "employees without department are included",
    allEmployees.data.some((emp) => emp.department === null),
  );
}
