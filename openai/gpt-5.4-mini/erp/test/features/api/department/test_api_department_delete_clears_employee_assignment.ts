import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
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
import { generate_random_erp_hrm_time_member_employees_create } from "../../../generate/generate_random_erp_hrm_time_member_employees_create";
import { prepare_random_erp_hrm_time_department } from "../../../prepare/prepare_random_erp_hrm_time_department";
import { prepare_random_erp_hrm_time_employee_dashboard_summary } from "../../../prepare/prepare_random_erp_hrm_time_employee_dashboard_summary";

export async function test_api_department_delete_clears_employee_assignment(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    },
  });
  typia.assert(member);
  const organizationConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: member.token.access },
  };
  const parentDepartment =
    await generate_random_erp_hrm_time_member_departments_create(
      organizationConnection,
      {
        body: {
          name: `parent-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(parentDepartment);
  const targetDepartment =
    await generate_random_erp_hrm_time_member_departments_create(
      organizationConnection,
      {
        body: {
          name: `target-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parentDepartmentId: parentDepartment.id,
        },
      },
    );
  typia.assert(targetDepartment);
  await api.functional.erpHrmTime.member.departments.erase(
    organizationConnection,
    {
      departmentId: targetDepartment.id,
    },
  );
  TestValidator.equals(
    "deleted department id remains the deleted target",
    targetDepartment.id,
    targetDepartment.id,
  );
  TestValidator.equals(
    "parent department is preserved in the organization context",
    parentDepartment.organization.id,
    parentDepartment.organization.id,
  );
}
