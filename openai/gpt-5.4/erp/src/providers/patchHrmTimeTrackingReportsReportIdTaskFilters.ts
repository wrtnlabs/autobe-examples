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

export async function patchHrmTimeTrackingReportsReportIdTaskFilters(props: {
  reportId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingReportTaskFilter.IUpdateRequest;
}): Promise<IHrmTimeTrackingReportTaskFilter.ICollection> {
  const report =
    await MyGlobal.prisma.hrm_time_tracking_reports.findFirstOrThrow({
      where: {
        id: props.reportId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_tracking_organization_id: true,
      },
    });
  const uniqueTaskIds: Array<string & tags.Format<"uuid">> = [];
  const requestedTaskIds = new Set<string>();
  for (const taskFilter of props.body.taskFilters) {
    if (requestedTaskIds.has(taskFilter.task_id) === false) {
      requestedTaskIds.add(taskFilter.task_id);
      uniqueTaskIds.push(taskFilter.task_id);
    }
  }
  if (uniqueTaskIds.length !== 0) {
    const validatedTasks =
      await MyGlobal.prisma.hrm_time_tracking_tasks.findMany({
        where: {
          id: {
            in: uniqueTaskIds,
          },
          deleted_at: null,
          project: {
            hrm_time_tracking_organization_id:
              report.hrm_time_tracking_organization_id,
          },
        },
        select: {
          id: true,
        },
      });
    const validatedTaskIds = new Set(validatedTasks.map((task) => task.id));
    for (const taskId of uniqueTaskIds) {
      if (validatedTaskIds.has(taskId) === false) {
        throw new HttpException("Invalid task selection", 400);
      }
    }
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    const now = new Date();
    await tx.hrm_time_tracking_report_task_filters.updateMany({
      where: {
        hrm_time_tracking_report_id: report.id,
        deleted_at: null,
      },
      data: {
        updated_at: now,
        deleted_at: now,
      },
    });
    for (const taskId of uniqueTaskIds) {
      await tx.hrm_time_tracking_report_task_filters.create({
        data: {
          id: v4(),
          report: {
            connect: {
              id: report.id,
            },
          },
          task: {
            connect: {
              id: taskId,
            },
          },
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
    }
  });
  const records =
    await MyGlobal.prisma.hrm_time_tracking_report_task_filters.findMany({
      where: {
        hrm_time_tracking_report_id: report.id,
        deleted_at: null,
      },
      orderBy: {
        created_at: "asc",
      },
      ...HrmTimeTrackingReportTaskFilterTransformer.select(),
    });
  return {
    reportId: report.id,
    taskFilters: await ArrayUtil.asyncMap(
      records,
      HrmTimeTrackingReportTaskFilterTransformer.transform,
    ),
  };
}
