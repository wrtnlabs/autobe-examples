import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMembership";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_time_tracking_project_membership(
  input?: DeepPartial<IHrmTimeTrackingProjectMembership.ICreate>,
): IHrmTimeTrackingProjectMembership.ICreate {
  return {
    employee_id:
      input?.employee_id ?? typia.random<string & tags.Format<"uuid">>(),
    membership_role:
      input?.membership_role ??
      RandomGenerator.pick(["member", "project-lead"] as const),
  };
}
