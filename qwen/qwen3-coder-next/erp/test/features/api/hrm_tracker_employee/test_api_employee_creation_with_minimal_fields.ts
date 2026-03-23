import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_employees_create } from "../../../generate/generate_random_hrm_tracker_member_employees_create";
import { generate_random_hrm_tracker_member_organizations_create } from "../../../generate/generate_random_hrm_tracker_member_organizations_create";
import { prepare_random_hrm_tracker_employee } from "../../../prepare/prepare_random_hrm_tracker_employee";
import { prepare_random_hrm_tracker_organization } from "../../../prepare/prepare_random_hrm_tracker_organization";

export async function test_api_employee_creation_with_minimal_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create organization first
  const orgConnection: api.IConnection = { host: connection.host };
  const org = await generate_random_hrm_tracker_member_organizations_create(
    orgConnection,
    {
      body: {
        name: RandomGenerator.name(),
        currency: "KRW",
        timezone: "Asia/Seoul",
        fiscal_start_month: 1,
      } satisfies IHrmTrackerOrganization.ICreate,
    },
  );
  typia.assert(org);
  // 2. Create member to be assigned as employee
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(member);
  // 3. Create employee with minimal fields (null optional fields)
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await api.functional.hrmTracker.member.employees.create(
    employeeConnection,
    {
      body: {
        employment_type: "full-time",
        status: "active",
        position: null,
        department_id: null,
        role_id: null,
        organization_id: org.id,
        user_id: member.id,
      } satisfies IHrmTrackerEmployee.ICreate,
    },
  );
  typia.assert(employee);
  // 4. Validate minimal fields
  TestValidator.equals(
    "employment_type matches",
    employee.employment_type,
    "full-time",
  );
  TestValidator.equals("status matches", employee.status, "active");
  TestValidator.equals(
    "organization matches",
    employee.organization.id,
    org.id,
  );
  TestValidator.equals("user matches", employee.user.id, member.id);
  // 5. Validate nullable fields are null
  TestValidator.equals("position is null", employee.position, null);
  TestValidator.equals("department_id is null", employee.department_id, null);
  TestValidator.equals("role_id is null", employee.role_id, null);
  TestValidator.equals(
    "organization name matches",
    employee.organization.name,
    org.name,
  );
  TestValidator.equals(
    "member display_name matches",
    employee.user.display_name,
    member.display_name,
  );
}
