import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsDepartment";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organization_members_create } from "../../../generate/generate_random_hrms_member_organization_members_create";
import { generate_random_hrms_member_organizations_employees_timelogs_create } from "../../../generate/generate_random_hrms_member_organizations_employees_timelogs_create";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";
import { prepare_random_hrms_timelog } from "../../../prepare/prepare_random_hrms_timelog";

export async function test_api_employee_update_deactivation_preserves_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const authConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create organization membership to establish employee record
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuth.token.access },
  };
  const membership =
    await generate_random_hrms_member_organization_members_create(
      memberConnection,
      {},
    );
  typia.assert(membership);
  const organizationId = membership.organization.id;
  const employeeId = membership.member.id;
  // 3. Get current employee record before deactivation
  const beforeUpdateEmployee =
    await api.functional.hrms.member.organizations.employees.update(
      memberConnection,
      {
        organizationId,
        employeeId,
        body: {},
      },
    );
  typia.assert(beforeUpdateEmployee);
  const originalStatus = beforeUpdateEmployee.status;
  const originalDisplayName = beforeUpdateEmployee.display_name;
  const originalPosition = beforeUpdateEmployee.position;
  const originalEmploymentType = beforeUpdateEmployee.employment_type;
  const originalDepartment = beforeUpdateEmployee.department;
  // 4. Update employee status to deactivated
  const updateBody = {
    status: "deactivated" satisfies IHrmsEmployee.IUpdate["status"],
  } satisfies IHrmsEmployee.IUpdate;
  const updatedEmployee =
    await api.functional.hrms.member.organizations.employees.update(
      memberConnection,
      {
        organizationId,
        employeeId,
        body: updateBody,
      },
    );
  typia.assert(updatedEmployee);
  // 5. Verify employee status is updated to deactivated
  TestValidator.equals(
    "employee status is deactivated",
    updatedEmployee.status,
    "deactivated",
  );
  // 6. Verify historical data is preserved (other fields unchanged)
  TestValidator.equals(
    "display name preserved after deactivation",
    updatedEmployee.display_name,
    originalDisplayName,
  );
  TestValidator.equals(
    "position preserved after deactivation",
    updatedEmployee.position,
    originalPosition,
  );
  TestValidator.equals(
    "employment type preserved after deactivation",
    updatedEmployee.employment_type,
    originalEmploymentType,
  );
  TestValidator.equals(
    "department preserved after deactivation",
    updatedEmployee.department?.id ?? null,
    originalDepartment?.id ?? null,
  );
  // 7. Verify organization membership and role references are preserved
  TestValidator.equals(
    "organization member reference preserved",
    updatedEmployee.organization_member.id,
    membership.id,
  );
  TestValidator.equals(
    "organization reference preserved",
    updatedEmployee.organization_member.organization.id,
    organizationId,
  );
  TestValidator.equals(
    "role reference preserved",
    updatedEmployee.role.id,
    membership.organizationRole.id,
  );
}
