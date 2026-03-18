import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProjectMembership";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_time_tracking_project_membership(
  input?: DeepPartial<IErpHrmTimeTrackingProjectMembership.ICreate> | undefined,
): IErpHrmTimeTrackingProjectMembership.ICreate {
  return {
    employee_id:
      input?.employee_id ?? typia.random<string & tags.Format<"uuid">>(),
    membership_role:
      input?.membership_role ??
      RandomGenerator.pick([
        "admin",
        "manager",
        "member",
        "viewer",
        "contributor",
      ] as const),
  };
}
