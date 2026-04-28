import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
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
 * Successfully deactivates an employee in the organization.
 *
 * An organization owner creates a new employee by inviting a registered member, then deactivates that employee using the erase endpoint. The deactivates the employee from the organization, transitioning their employment status to deactivated while preserving all historical records for audit and compliance purposes. The deactivates the employee from the organization, setting the deleted_at timestamp.
 *
 * Special attention is given to verifying the complete employee lifecycle: member registration, employee invitation, and employee deactivation by confirming the deactivation operation completes successfully.
 *
 * 1. Organization owner member joins the platform and creates a default organization.
 * 2. A second member joins the platform to be invited as an employee.
 * 3. Organization owner invites the second member as an employee within the organization.
 * 4. Employee is deactivated (erased) and the operation completes without error.
 */
export async function test_api_employee_deactivate_successfully(
  connection: api.IConnection,
): Promise<void> {
  // 1. Organization owner joins the platform
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(owner);
  // 2. Second member joins to be invited as employee
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 3. Create employee by inviting second member to the organization
  const employee = await generate_random_hrm_platform_member_employees_create(
    ownerConnection,
    { body: { memberId: member.id } },
  );
  typia.assert(employee);
  // 4. Deactivate the employee
  await api.functional.hrmPlatform.member.employees.erase(ownerConnection, {
    employeeId: employee.id,
  });
}
