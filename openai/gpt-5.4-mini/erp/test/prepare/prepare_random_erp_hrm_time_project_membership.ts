import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProjectMembership";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_time_project_membership(
  input?: DeepPartial<IErpHrmTimeProjectMembership.ICreate> | undefined,
): IErpHrmTimeProjectMembership.ICreate {
  return {
    employeeId:
      input?.employeeId ?? typia.random<string & tags.Format<"uuid">>(),
    projectRole:
      input?.projectRole ??
      RandomGenerator.pick(["member", "project-lead"] as const),
  };
}
