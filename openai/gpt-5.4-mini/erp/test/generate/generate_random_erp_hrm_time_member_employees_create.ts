import api from "@ORGANIZATION/PROJECT-api";
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

import { prepare_random_erp_hrm_time_employee_dashboard_summary } from "../prepare/prepare_random_erp_hrm_time_employee_dashboard_summary";

export async function generate_random_erp_hrm_time_member_employees_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmTimeEmployeeDashboardSummary.ICreate> | undefined;
  },
): Promise<IErpHrmTimeEmployeeDashboardSummary> {
  const prepared: IErpHrmTimeEmployeeDashboardSummary.ICreate =
    prepare_random_erp_hrm_time_employee_dashboard_summary(props.body);
  return await api.functional.erpHrmTime.member.employees.create(connection, {
    body: prepared,
  });
}
