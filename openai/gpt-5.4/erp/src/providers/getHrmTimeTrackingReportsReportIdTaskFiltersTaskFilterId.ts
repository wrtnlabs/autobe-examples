import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReport";
import { IHrmTimeTrackingReportTaskFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportTaskFilter";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingReportTaskFilterTransformer } from "../transformers/HrmTimeTrackingReportTaskFilterTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackingReportsReportIdTaskFiltersTaskFilterId(props: {
  reportId: string & tags.Format<"uuid">;
  taskFilterId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingReportTaskFilter> {
  const taskFilter =
    await MyGlobal.prisma.hrm_time_tracking_report_task_filters.findFirstOrThrow(
      {
        where: {
          id: props.taskFilterId,
          hrm_time_tracking_report_id: props.reportId,
          deleted_at: null,
        },
        ...HrmTimeTrackingReportTaskFilterTransformer.select(),
      },
    );
  return await HrmTimeTrackingReportTaskFilterTransformer.transform(taskFilter);
}
