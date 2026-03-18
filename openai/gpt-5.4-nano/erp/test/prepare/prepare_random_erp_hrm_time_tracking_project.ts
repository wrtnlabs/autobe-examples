import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_time_tracking_project(
  input?: DeepPartial<IErpHrmTimeTrackingProject.ICreate> | undefined,
): IErpHrmTimeTrackingProject.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    color:
      input?.color ??
      typia.random<string & tags.Pattern<"^#[0-9a-fA-F]{6}$">>(),
    status: input?.status ?? "active",
  };
}
