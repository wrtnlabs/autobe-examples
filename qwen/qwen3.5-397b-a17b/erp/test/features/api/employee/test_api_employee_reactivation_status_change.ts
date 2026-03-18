import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";

/**
 * Test employee reactivation workflow by changing status from deactivated to active.
 *
 * This test validates the complete employee lifecycle:
 * 1. Create a member account
 * 2. Create an employee record in the organization
 * 3. Deactivate the employee (status = 'deactivated', deleted_at is set)
 * 4. Reactivate the employee (status = 'active', deleted_at is cleared)
 * 5. Verify the employee record shows active status and null deleted_at
 *
 * This ensures the business workflow for employee reactivation after temporary
 * leave or administrative deactivation works correctly.
 */
export async function test_api_employee_reactivation_status_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
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
  // 2. Create employee record using the authenticated member connection
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        employment_type: "full-time",
        status: "active",
      },
    },
  );
  typia.assert(employee);
  // Verify initial state is active
  TestValidator.equals("initial status is active", employee.status, "active");
  TestValidator.equals("initial deleted_at is null", employee.deleted_at, null);
  // 3. Deactivate the employee
  const deactivatedEmployee =
    await api.functional.hrmPlatform.member.employees.update(memberConnection, {
      employeeId: employee.id,
      body: {
        status: "deactivated",
      } satisfies IHrmPlatformEmployee.IUpdate,
    });
  typia.assert(deactivatedEmployee);
  // Verify deactivation
  TestValidator.equals(
    "deactivated status",
    deactivatedEmployee.status,
    "deactivated",
  );
  TestValidator.predicate(
    "deleted_at is set after deactivation",
    deactivatedEmployee.deleted_at !== null,
  );
  // 4. Reactivate the employee (the main test scenario)
  const reactivatedEmployee =
    await api.functional.hrmPlatform.member.employees.update(memberConnection, {
      employeeId: employee.id,
      body: {
        status: "active",
      } satisfies IHrmPlatformEmployee.IUpdate,
    });
  typia.assert(reactivatedEmployee);
  // 5. Verify reactivation - status is active and deleted_at is cleared
  TestValidator.equals(
    "reactivated status is active",
    reactivatedEmployee.status,
    "active",
  );
  TestValidator.equals(
    "deleted_at is cleared after reactivation",
    reactivatedEmployee.deleted_at,
    null,
  );
  TestValidator.notEquals(
    "updated_at changed after reactivation",
    employee.updated_at,
    reactivatedEmployee.updated_at,
  );
}
