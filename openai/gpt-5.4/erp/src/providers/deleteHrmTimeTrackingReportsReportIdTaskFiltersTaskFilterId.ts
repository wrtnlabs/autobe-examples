import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteHrmTimeTrackingReportsReportIdTaskFiltersTaskFilterId(props: {
  reportId: string & tags.Format<"uuid">;
  taskFilterId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const report = await prisma.hrm_time_tracking_reports.findUniqueOrThrow({
      where: {
        id: props.reportId,
      },
      select: {
        id: true,
      },
    });
    const taskFilter =
      await prisma.hrm_time_tracking_report_task_filters.findUniqueOrThrow({
        where: {
          id: props.taskFilterId,
        },
        select: {
          hrm_time_tracking_report_id: true,
        },
      });
    if (taskFilter.hrm_time_tracking_report_id !== report.id) {
      throw new HttpException("Not Found", 404);
    }
    await prisma.hrm_time_tracking_report_task_filters.delete({
      where: {
        id: props.taskFilterId,
      },
    });
  });
}
