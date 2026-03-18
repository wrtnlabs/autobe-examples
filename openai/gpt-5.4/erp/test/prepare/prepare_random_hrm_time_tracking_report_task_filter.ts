import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingReportTaskFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportTaskFilter";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_time_tracking_report_task_filter(
  input?: DeepPartial<IHrmTimeTrackingReportTaskFilter.ICreate>,
): IHrmTimeTrackingReportTaskFilter.ICreate {
  return {
    task_id: input?.task_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
