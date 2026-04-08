import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimePermission";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_departments_create } from "../../../generate/generate_random_erp_hrm_time_member_departments_create";
import { generate_random_erp_hrm_time_member_roles_create } from "../../../generate/generate_random_erp_hrm_time_member_roles_create";
import { prepare_random_erp_hrm_time_department } from "../../../prepare/prepare_random_erp_hrm_time_department";
import { prepare_random_erp_hrm_time_role } from "../../../prepare/prepare_random_erp_hrm_time_role";

export async function test_api_employee_update_department_role_status(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234!" as string,
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: RandomGenerator.mobile(),
      href: "https://example.com/erp/hrm",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const department =
    await generate_random_erp_hrm_time_member_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IErpHrmTimeDepartment.ICreate,
      },
    );
  typia.assert(department);
  const role = await generate_random_erp_hrm_time_member_roles_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.alphabets(8),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        permissions: [
          {
            id: typia.random<string & tags.Format<"uuid">>(),
            key: "employee:manage",
            description: "Manage employees",
          } satisfies IErpHrmTimePermission.ISummary,
        ],
      } satisfies IErpHrmTimeRole.ICreate,
    },
  );
  typia.assert(role);
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const firstUpdate = {
    erp_hrm_time_department_id: department.id,
    position_title: RandomGenerator.name(),
    employment_type: "full-time",
    erp_hrm_time_role_id: role.id,
    status: "active",
  } satisfies IErpHrmTimeEmployeeDashboardSummary.IUpdate;
  const updated = await api.functional.erpHrmTime.member.employees.update(
    memberConnection,
    {
      employeeId,
      body: firstUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals(
    "employee id should be preserved",
    updated.id,
    employeeId,
  );
  TestValidator.equals(
    "department should match requested value",
    updated.erpHrmTimeDepartmentId,
    department.id,
  );
  TestValidator.equals(
    "role should match requested value",
    updated.erpHrmTimeRoleId,
    role.id,
  );
  TestValidator.equals(
    "position title should match requested value",
    updated.positionTitle,
    firstUpdate.position_title ?? null,
  );
  TestValidator.equals(
    "employment type should match requested value",
    updated.employmentType,
    firstUpdate.employment_type ?? null,
  );
  TestValidator.equals(
    "status should match requested value",
    updated.status,
    firstUpdate.status ?? null,
  );
  const cleared = await api.functional.erpHrmTime.member.employees.update(
    memberConnection,
    {
      employeeId,
      body: {
        erp_hrm_time_department_id: null,
      } satisfies IErpHrmTimeEmployeeDashboardSummary.IUpdate,
    },
  );
  typia.assert(cleared);
  TestValidator.equals(
    "department should be cleared",
    cleared.erpHrmTimeDepartmentId,
    null,
  );
  TestValidator.equals(
    "same employee should be returned after clearing department",
    cleared.id,
    employeeId,
  );
}
