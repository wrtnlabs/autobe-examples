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

export async function test_api_employee_role_change_history_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create organization as member with employee:manage permission
  const adminConnection: api.IConnection = { host: connection.host };
  const adminMember = await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(adminMember);
  const newAdminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminMember.token.access },
  };
  const organization =
    await generate_random_hrm_tracker_member_organizations_create(
      newAdminConnection,
      {},
    );
  typia.assert(organization);
  // 2. Create employee with admin permission
  const employee = await generate_random_hrm_tracker_member_employees_create(
    newAdminConnection,
    {
      body: {
        employment_type: "full-time",
        status: "active",
        position: null,
        department_id: null,
        role_id: null,
        organization_id: organization.id,
        user_id: adminMember.id,
      },
    },
  );
  typia.assert(employee);
  // 3. Create unauthorized member without employee:manage permission
  const unauthorizedConnection: api.IConnection = {
    host: connection.host,
  };
  const unauthorizedMember = await authorize_member_join(
    unauthorizedConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        display_name: RandomGenerator.name(),
      },
    },
  );
  typia.assert(unauthorizedMember);
  const newUnauthorizedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: unauthorizedMember.token.access },
  };
  // 4. Unauthorized member attempts to access role change history
  await TestValidator.error(
    "should throw 403 Forbidden for unauthorized role change history access",
    async () => {
      await api.functional.hrmTracker.employees.role_changes.index(
        newUnauthorizedConnection,
        {
          employeeId: employee.id,
        },
      );
    },
  );
}
