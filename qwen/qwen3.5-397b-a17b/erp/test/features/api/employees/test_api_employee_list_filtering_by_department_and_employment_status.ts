import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
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
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";

export async function test_api_employee_list_filtering_by_department_and_employment_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Create test departments
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
  // 3. Create a second member to add as employee
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member2Auth);
  const member3Connection: api.IConnection = { host: connection.host };
  const member3Auth = await authorize_member_join(member3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member3Auth);
  const member4Connection: api.IConnection = { host: connection.host };
  const member4Auth = await authorize_member_join(member4Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member4Auth);
  // Note: We need to get the role_id from the organization
  // For this test, we'll need to use the authenticated connection
  // and assume there's a default role available
  // Create employees with different attributes
  // Employee 1: Engineering, full-time, active
  const employee1 = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: authResult.member.id,
        department_id: department1.id,
        employment_type: "full-time",
        status: "active",
        position: "Senior Developer",
      },
    },
  );
  typia.assert(employee1);
  // Employee 2: Marketing, part-time, active
  const employee2 = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: member2Auth.member.id,
        department_id: department2.id,
        employment_type: "part-time",
        status: "active",
        position: "Marketing Coordinator",
      },
    },
  );
  typia.assert(employee2);
  // Employee 3: Engineering, contractor, active
  const employee3 = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: member3Auth.member.id,
        department_id: department1.id,
        employment_type: "contractor",
        status: "active",
        position: "Consultant",
      },
    },
  );
  typia.assert(employee3);
  // Employee 4: No department, intern, deactivated
  const employee4 = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: member4Auth.member.id,
        department_id: null,
        employment_type: "intern",
        status: "deactivated",
        position: "Intern",
      },
    },
  );
  typia.assert(employee4);
  // 4. Test filtering by department_id
  const engineeringEmployees =
    await api.functional.hrmPlatform.member.employees.index(memberConnection, {
      body: {
        department_id: department1.id,
        limit: 10,
      } satisfies IHrmPlatformEmployee.IRequest,
    });
  typia.assert(engineeringEmployees);
  TestValidator.predicate("engineering department filter", () =>
    engineeringEmployees.data.every(
      (emp) => emp.department?.id === department1.id,
    ),
  );
  TestValidator.predicate(
    "engineering has employees",
    () => engineeringEmployees.data.length >= 2,
  );
  // 5. Test filtering by employment_type
  const fullTimeEmployees =
    await api.functional.hrmPlatform.member.employees.index(memberConnection, {
      body: {
        employment_type: "full-time",
        limit: 10,
      } satisfies IHrmPlatformEmployee.IRequest,
    });
  typia.assert(fullTimeEmployees);
  TestValidator.predicate("full-time employment type filter", () =>
    fullTimeEmployees.data.every((emp) => emp.employment_type === "full-time"),
  );
  const partTimeEmployees =
    await api.functional.hrmPlatform.member.employees.index(memberConnection, {
      body: {
        employment_type: "part-time",
        limit: 10,
      } satisfies IHrmPlatformEmployee.IRequest,
    });
  typia.assert(partTimeEmployees);
  TestValidator.predicate("part-time employment type filter", () =>
    partTimeEmployees.data.every((emp) => emp.employment_type === "part-time"),
  );
  // 6. Test filtering by status=active
  const activeEmployees =
    await api.functional.hrmPlatform.member.employees.index(memberConnection, {
      body: {
        status: "active",
        limit: 10,
      } satisfies IHrmPlatformEmployee.IRequest,
    });
  typia.assert(activeEmployees);
  TestValidator.predicate("active status filter", () =>
    activeEmployees.data.every((emp) => emp.status === "active"),
  );
  // 7. Test filtering by status=deactivated
  const deactivatedEmployees =
    await api.functional.hrmPlatform.member.employees.index(memberConnection, {
      body: {
        status: "deactivated",
        limit: 10,
      } satisfies IHrmPlatformEmployee.IRequest,
    });
  typia.assert(deactivatedEmployees);
  TestValidator.predicate("deactivated status filter", () =>
    deactivatedEmployees.data.every((emp) => emp.status === "deactivated"),
  );
  // 8. Test combined filters (department_id + employment_type)
  const engineeringContractors =
    await api.functional.hrmPlatform.member.employees.index(memberConnection, {
      body: {
        department_id: department1.id,
        employment_type: "contractor",
        limit: 10,
      } satisfies IHrmPlatformEmployee.IRequest,
    });
  typia.assert(engineeringContractors);
  TestValidator.predicate("combined department and employment filter", () =>
    engineeringContractors.data.every(
      (emp) =>
        emp.department?.id === department1.id &&
        emp.employment_type === "contractor",
    ),
  );
  // 9. Test combined filters (all three)
  const engineeringActiveFullTime =
    await api.functional.hrmPlatform.member.employees.index(memberConnection, {
      body: {
        department_id: department1.id,
        employment_type: "full-time",
        status: "active",
        limit: 10,
      } satisfies IHrmPlatformEmployee.IRequest,
    });
  typia.assert(engineeringActiveFullTime);
  TestValidator.predicate("combined all filters", () =>
    engineeringActiveFullTime.data.every(
      (emp) =>
        emp.department?.id === department1.id &&
        emp.employment_type === "full-time" &&
        emp.status === "active",
    ),
  );
  // 10. Test display_name search with partial match
  const searchResult = await api.functional.hrmPlatform.member.employees.index(
    memberConnection,
    {
      body: {
        search: employee1.display_name.substring(0, 3),
        limit: 10,
      } satisfies IHrmPlatformEmployee.IRequest,
    },
  );
  typia.assert(searchResult);
  TestValidator.predicate("search returns matching employee", () =>
    searchResult.data.some((emp) =>
      emp.display_name.includes(
        employee1.display_name.substring(0, 3).toLowerCase(),
      ),
    ),
  );
  // 11. Test empty results with valid pagination
  const emptyResult = await api.functional.hrmPlatform.member.employees.index(
    memberConnection,
    {
      body: {
        department_id: typia.random<string & tags.Format<"uuid">>(),
        limit: 10,
      } satisfies IHrmPlatformEmployee.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals("empty result data", emptyResult.data, []);
  TestValidator.predicate(
    "empty result pagination valid",
    () =>
      emptyResult.pagination.records === 0 &&
      emptyResult.pagination.pages === 0 &&
      emptyResult.pagination.current === 1,
  );
  // 12. Test pagination metadata
  TestValidator.predicate(
    "pagination metadata valid",
    () =>
      engineeringEmployees.pagination.current >= 1 &&
      engineeringEmployees.pagination.limit > 0 &&
      engineeringEmployees.pagination.records >=
        engineeringEmployees.data.length,
  );
}
