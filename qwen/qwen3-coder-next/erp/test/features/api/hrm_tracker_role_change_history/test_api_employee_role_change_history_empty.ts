import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerEmployeeRoleChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployeeRoleChange";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerEmployeeRoleChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerEmployeeRoleChange";
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

export async function test_api_employee_role_change_history_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authorization
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
  // 2. Create organization as member
  const org = await api.functional.hrmTracker.member.organizations.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        logo_image_uri: null,
        currency: "KRW",
        timezone: "Asia/Seoul",
        fiscal_start_month: 1,
      } satisfies IHrmTrackerOrganization.ICreate,
    },
  );
  typia.assert(org);
  // 3. Create employee with no prior role changes
  const employee = await api.functional.hrmTracker.member.employees.create(
    memberConnection,
    {
      body: {
        employment_type: "full-time",
        status: "active",
        position: "Employee",
        department_id: null,
        role_id: null,
        organization_id: org.id,
        user_id: member.id,
      } satisfies IHrmTrackerEmployee.ICreate,
    },
  );
  typia.assert(employee);
  // 4. Retrieve role change history for employee with no history
  const result = await api.functional.hrmTracker.employees.role_changes.index(
    memberConnection,
    {
      employeeId: employee.id,
    },
  );
  typia.assert(result);
  // 5. Validate empty history response
  TestValidator.equals("no role changes", result.data.length, 0);
  TestValidator.equals(
    "pagination total records",
    result.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages", result.pagination.pages, 0);
}
