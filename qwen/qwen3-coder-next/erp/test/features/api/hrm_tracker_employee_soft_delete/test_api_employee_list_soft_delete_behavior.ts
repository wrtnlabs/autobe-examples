import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_hrm_tracker_member_employees_create } from "../../../generate/generate_random_hrm_tracker_member_employees_create";
import { generate_random_hrm_tracker_member_organizations_create } from "../../../generate/generate_random_hrm_tracker_member_organizations_create";
import { prepare_random_hrm_tracker_employee } from "../../../prepare/prepare_random_hrm_tracker_employee";
import { prepare_random_hrm_tracker_organization } from "../../../prepare/prepare_random_hrm_tracker_organization";

export async function test_api_employee_list_soft_delete_behavior(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 2. Create organization
  const org = await api.functional.hrmTracker.member.organizations.create(
    memberConnection,
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
  // 3. Select organization context
  await api.functional.hrmTracker.member.organizations.update(
    memberConnection,
    {
      organizationId: org.id,
      body: {} satisfies IHrmTrackerOrganization.IUpdate,
    },
  );
  // 4. Create employees
  const employeeCount = 5;
  const employees = await ArrayUtil.asyncRepeat(employeeCount, async (i) => {
    const employee = await api.functional.hrmTracker.member.employees.create(
      memberConnection,
      {
        body: {
          employment_type: "full-time",
          status: "active",
          position: `Position ${i + 1}`,
          department_id: null,
          role_id: null,
          organization_id: org.id,
          user_id: member.id,
        } satisfies IHrmTrackerEmployee.ICreate,
      },
    );
    typia.assert(employee);
    return employee;
  });
  // 5. Soft-delete one employee (deactivate by setting deleted_at)
  const toDeactivate = employees[0];
  // Use the update endpoint to set deleted_at timestamp
  await api.functional.hrmTracker.employees.index(memberConnection, {
    body: {
      status: "deactivated",
      department_id: toDeactivate.department_id ?? "",
      employment_type: "",
      position: "",
      cursor: "0",
      limit: 1,
      page: 1,
    } satisfies IHrmTrackerEmployee.IRequest,
  });
  // 6. Retrieve employee list and verify soft-delete behavior
  const listResponse = await api.functional.hrmTracker.employees.index(
    memberConnection,
    {
      body: {
        status: "active",
        department_id: "",
        employment_type: "",
        position: "",
        cursor: "0",
        limit: 100,
        page: 1,
      } satisfies IHrmTrackerEmployee.IRequest,
    },
  );
  typia.assert(listResponse);
  // 7. Validate results
  TestValidator.equals(
    "employee count excludes soft-deleted",
    listResponse.data.length,
    employeeCount - 1,
  );
  TestValidator.predicate(
    "soft-deleted employee not in list",
    () => !listResponse.data.some((e) => e.id === toDeactivate.id),
  );
  TestValidator.equals(
    "pagination records excludes soft-deleted",
    listResponse.pagination.records,
    employeeCount - 1,
  );
  TestValidator.equals(
    "pagination pages correct",
    listResponse.pagination.pages,
    1,
  );
  TestValidator.equals(
    "pagination limit correct",
    listResponse.pagination.limit,
    100,
  );
}
