import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingReportProjectFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportProjectFilter";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_time_tracking_report_project_filter(
  input?: DeepPartial<IHrmTimeTrackingReportProjectFilter.ICreate>,
): IHrmTimeTrackingReportProjectFilter.ICreate {
  const generatedProjectIds = Array.from(
    new Set(
      Array.from(
        {
          length: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
        },
        () => typia.random<string & tags.Format<"uuid">>(),
      ),
    ),
  );
  const projectIds = input?.projectIds
    ? Array.from(new Set(input.projectIds))
    : generatedProjectIds;
  return {
    projectIds:
      projectIds.length > 0
        ? projectIds
        : [typia.random<string & tags.Format<"uuid">>()],
  };
}
