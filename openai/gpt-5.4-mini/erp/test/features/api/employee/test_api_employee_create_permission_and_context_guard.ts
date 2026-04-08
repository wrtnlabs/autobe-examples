import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeOrganizationMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationMembership";
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
import { generate_random_erp_hrm_time_member_organization_memberships_create } from "../../../generate/generate_random_erp_hrm_time_member_organization_memberships_create";
import { prepare_random_erp_hrm_time_employee_dashboard_summary } from "../../../prepare/prepare_random_erp_hrm_time_employee_dashboard_summary";
import { prepare_random_erp_hrm_time_organization_membership } from "../../../prepare/prepare_random_erp_hrm_time_organization_membership";

export async function test_api_employee_create_permission_and_context_guard(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const unauthorizedContextConnection: api.IConnection = {
    host: connection.host,
  };
  unauthorizedContextConnection.headers = {
    Authorization: member.token.access,
  };
  await TestValidator.httpError(
    "employee creation must be rejected when the caller lacks employee management permission",
    [401, 403],
    async () => {
      await api.functional.erpHrmTime.member.employees.create(
        unauthorizedContextConnection,
        {
          body: {
            member_id: typia.random<string & tags.Format<"uuid">>(),
            role_id: typia.random<string & tags.Format<"uuid">>(),
            employment_type: "full-time",
          } satisfies IErpHrmTimeEmployeeDashboardSummary.ICreate,
        },
      );
    },
  );
  const isolatedConnection: api.IConnection = { host: connection.host };
  isolatedConnection.headers = {
    Authorization: member.token.access,
  };
  await TestValidator.httpError(
    "employee creation must also be rejected when organization context is not established for the selected session",
    [401, 403],
    async () => {
      await api.functional.erpHrmTime.member.employees.create(
        isolatedConnection,
        {
          body: {
            member_id: typia.random<string & tags.Format<"uuid">>(),
            role_id: typia.random<string & tags.Format<"uuid">>(),
            employment_type: "contractor",
          } satisfies IErpHrmTimeEmployeeDashboardSummary.ICreate,
        },
      );
    },
  );
}
