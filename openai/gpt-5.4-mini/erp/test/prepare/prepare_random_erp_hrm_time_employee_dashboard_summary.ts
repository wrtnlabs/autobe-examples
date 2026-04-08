import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_time_employee_dashboard_summary(
  input?: DeepPartial<IErpHrmTimeEmployeeDashboardSummary.ICreate> | undefined,
): IErpHrmTimeEmployeeDashboardSummary.ICreate {
  return {
    member_id: input?.member_id ?? typia.random<string & tags.Format<"uuid">>(),
    role_id: input?.role_id ?? typia.random<string & tags.Format<"uuid">>(),
    department_id:
      input?.department_id === undefined
        ? null
        : input.department_id === null
          ? null
          : input.department_id,
    position_title:
      input?.position_title === undefined
        ? RandomGenerator.name(2)
        : input.position_title,
    employment_type:
      input?.employment_type ??
      RandomGenerator.pick([
        "full-time",
        "part-time",
        "contractor",
        "intern",
      ] as const),
  };
}
