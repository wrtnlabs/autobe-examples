import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReport";
import { IHrmTimeTrackingReportTaskFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportTaskFilter";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingReportAtSummaryTransformer } from "./HrmTimeTrackingReportAtSummaryTransformer";
import { HrmTimeTrackingTaskAtSummaryTransformer } from "./HrmTimeTrackingTaskAtSummaryTransformer";

export namespace HrmTimeTrackingReportTaskFilterTransformer {
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingReportTaskFilter> {
    return {
      id: input.id,
      report: await HrmTimeTrackingReportAtSummaryTransformer.transform(
        input.report,
      ),
      task: await HrmTimeTrackingTaskAtSummaryTransformer.transform(input.task),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        report: HrmTimeTrackingReportAtSummaryTransformer.select(),
        task: HrmTimeTrackingTaskAtSummaryTransformer.select(),
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.hrm_time_tracking_report_task_filtersFindManyArgs;
  }
  export type Payload = Prisma.hrm_time_tracking_report_task_filtersGetPayload<
    ReturnType<typeof select>
  >;
}
