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
import { HrmTimeTrackingReportTaskFilterCollector } from "../collectors/HrmTimeTrackingReportTaskFilterCollector";
import { HrmTimeTrackingReportTaskFilterTransformer } from "../transformers/HrmTimeTrackingReportTaskFilterTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingReportsReportIdTaskFilters(props: {
  reportId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingReportTaskFilter.ICreate;
}): Promise<IHrmTimeTrackingReportTaskFilter> {
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
  const task = await MyGlobal.prisma.hrm_time_tracking_tasks.findFirstOrThrow({
    where: {
      id: props.body.task_id,
      deleted_at: null,
      project: {
        hrm_time_tracking_organization_id:
          report.hrm_time_tracking_organization_id,
        deleted_at: null,
      },
    },
    select: {
      id: true,
    },
  });
  const existing =
    await MyGlobal.prisma.hrm_time_tracking_report_task_filters.findFirst({
      where: {
        hrm_time_tracking_report_id: report.id,
        hrm_time_tracking_task_id: task.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (existing !== null) {
    throw new HttpException("Task filter already exists", 409);
  }
  try {
    const created =
      await MyGlobal.prisma.hrm_time_tracking_report_task_filters.create({
        data: await HrmTimeTrackingReportTaskFilterCollector.collect({
          body: props.body,
          hrmTimeTrackingReports: {
            id: report.id,
          } satisfies IEntity,
        }),
        ...HrmTimeTrackingReportTaskFilterTransformer.select(),
      });
    return await HrmTimeTrackingReportTaskFilterTransformer.transform(created);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException("Task filter already exists", 409);
    }
    throw error;
  }
}
