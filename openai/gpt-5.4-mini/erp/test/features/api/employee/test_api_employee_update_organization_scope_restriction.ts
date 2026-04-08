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
import { generate_random_erp_hrm_time_member_employees_create } from "../../../generate/generate_random_erp_hrm_time_member_employees_create";
import { prepare_random_erp_hrm_time_employee_dashboard_summary } from "../../../prepare/prepare_random_erp_hrm_time_employee_dashboard_summary";

export async function test_api_employee_update_organization_scope_restriction(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerPassword = `Pw${RandomGenerator.alphabets(10)}1!`;
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
      displayName: RandomGenerator.name(),
      href: connection.host,
      referrer: connection.host,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(ownerAuth);
  const ownerEmployee =
    await generate_random_erp_hrm_time_member_employees_create(
      ownerConnection,
      {
        body: {
          member_id: ownerAuth.id,
          employment_type: "full-time",
        },
      },
    );
  typia.assert(ownerEmployee);
  const outsiderConnection: api.IConnection = { host: connection.host };
  const outsiderEmail = typia.random<string & tags.Format<"email">>();
  const outsiderPassword = `Pw${RandomGenerator.alphabets(10)}2!`;
  const outsiderAuth = await authorize_member_join(outsiderConnection, {
    body: {
      email: outsiderEmail,
      password: outsiderPassword,
      displayName: RandomGenerator.name(),
      href: connection.host,
      referrer: connection.host,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(outsiderAuth);
  await TestValidator.error(
    "cross-organization employee update should be rejected",
    async () => {
      await api.functional.erpHrmTime.member.employees.update(
        outsiderConnection,
        {
          employeeId: ownerEmployee.id,
          body: {
            position_title: RandomGenerator.name(),
            employment_type: "part-time",
          } satisfies IErpHrmTimeEmployeeDashboardSummary.IUpdate,
        },
      );
    },
  );
  const updatedOwnerEmployee =
    await api.functional.erpHrmTime.member.employees.update(ownerConnection, {
      employeeId: ownerEmployee.id,
      body: {
        position_title: RandomGenerator.name(),
        employment_type: "part-time",
      } satisfies IErpHrmTimeEmployeeDashboardSummary.IUpdate,
    });
  typia.assert(updatedOwnerEmployee);
  TestValidator.equals(
    "organization scope should remain unchanged after a valid in-org update",
    updatedOwnerEmployee.erpHrmTimeOrganizationId,
    ownerEmployee.erpHrmTimeOrganizationId,
  );
  TestValidator.equals(
    "employee record id should remain the same after update",
    updatedOwnerEmployee.id,
    ownerEmployee.id,
  );
}
