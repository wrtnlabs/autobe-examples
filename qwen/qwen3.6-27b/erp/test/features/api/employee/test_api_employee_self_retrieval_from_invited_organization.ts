import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformOrganization";
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
 * Test that a member can retrieve their employee record from a different organization where they were invited as an employee.
 *
 * Validates the cross-organization employee self-retrieval mechanism by ensuring the composite lookup of member ID and organization ID returns the correct scoped employee record. Two members independently register with their own organizations, then one invites the other to join. The invited member switches context and verifies their employee record reflects the invitation details.
 *
 * Special attention is given to data isolation between organizational contexts, verifying that the session-based organization switching correctly scopes all subsequent employee lookups to the active organization.
 *
 * 1. Member A registers and creates Organization Alpha with default Owner role and employee record.
 * 2. Member B registers and creates Organization Beta with default Owner role and employee record.
 * 3. Member A invites Member B to Organization Alpha, assigning a specific role and optional department.
 * 4. Member B switches active organization context from Beta to Alpha using the organizations patch endpoint.
 * 5. Member B retrieves their employee record through the self-employee endpoint.
 * 6. Validates the response contains Member B's profile information, the role ID and employment type from the invitation, matching department and position values, and active employment status, confirming correct scoping by composite member-organization lookup.
 */
export async function test_api_employee_self_retrieval_from_invited_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A registers, creating Organization Alpha with default employee record
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Member B registers, creating Organization Beta with default employee record
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 3. Member A invites Member B to Organization Alpha with role and department assignment
  const invitedEmployee =
    await generate_random_hrm_platform_member_employees_create(
      memberAConnection,
      { body: { memberId: memberB.id } },
    );
  typia.assert(invitedEmployee);
  // 4. Member B switches active organization context from Beta to Alpha
  await api.functional.hrmPlatform.organizations.index(memberBConnection, {
    body: {} satisfies IHrmPlatformOrganization.IRequest,
  });
  // 5. Member B retrieves their employee record from Organization Alpha context
  const employee =
    await api.functional.hrmPlatform.member.employees.me(memberBConnection);
  typia.assert(employee);
  // 6. Validate the employee record reflects Member B in Organization Alpha
  // Member profile identity validation
  TestValidator.equals(
    "member id matches invited member",
    employee.member.id,
    memberB.id,
  );
  TestValidator.equals(
    "member email matches",
    employee.member.email,
    memberB.email,
  );
  TestValidator.equals(
    "member display name matches",
    employee.member.display_name,
    memberB.display_name,
  );
  // Employee record identity validation - must match invitation
  TestValidator.equals(
    "employee id matches invited record",
    employee.id,
    invitedEmployee.id,
  );
  TestValidator.equals(
    "role id matches assigned role",
    employee.role.id,
    invitedEmployee.role.id,
  );
  TestValidator.equals(
    "employment type matches",
    employee.employment_type,
    invitedEmployee.employment_type,
  );
  TestValidator.equals("status is active", employee.status, "active");
  // Nullable field validation - department and position
  const expectedDepartmentId = invitedEmployee.department?.id ?? null;
  TestValidator.equals(
    "department id matches",
    employee.department?.id ?? null,
    expectedDepartmentId,
  );
  TestValidator.equals(
    "position matches",
    employee.position ?? null,
    invitedEmployee.position ?? null,
  );
}
