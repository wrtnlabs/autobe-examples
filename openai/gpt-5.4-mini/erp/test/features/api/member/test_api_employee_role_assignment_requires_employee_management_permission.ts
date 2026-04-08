import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeOrganizationMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationMembership";
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
import { generate_random_erp_hrm_time_member_employees_create } from "../../../generate/generate_random_erp_hrm_time_member_employees_create";
import { generate_random_erp_hrm_time_member_role_assignment_create } from "../../../generate/generate_random_erp_hrm_time_member_role_assignment_create";
import { generate_random_erp_hrm_time_member_roles_create } from "../../../generate/generate_random_erp_hrm_time_member_roles_create";
import { prepare_random_erp_hrm_time_employee_dashboard_summary } from "../../../prepare/prepare_random_erp_hrm_time_employee_dashboard_summary";
import { prepare_random_erp_hrm_time_organization_membership } from "../../../prepare/prepare_random_erp_hrm_time_organization_membership";
import { prepare_random_erp_hrm_time_role } from "../../../prepare/prepare_random_erp_hrm_time_role";

export async function test_api_employee_role_assignment_requires_employee_management_permission(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@example.com`,
      password: "1234" as string & tags.Format<"password">,
      displayName: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com",
      avatarImageUrl: null,
      phoneNumber: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const unauthorizedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${joined.token.access}`,
    },
  };
  await TestValidator.httpError(
    "role assignment requires employee management permission",
    [401, 403],
    async () => {
      await api.functional.erpHrmTime.member.role_assignment.create(
        unauthorizedConnection,
        {
          body: {
            employeeId: typia.random<string & tags.Format<"uuid">>(),
            roleId: typia.random<string & tags.Format<"uuid">>(),
          } satisfies IErpHrmTimeOrganizationMembership.ICreate,
        },
      );
    },
  );
}
