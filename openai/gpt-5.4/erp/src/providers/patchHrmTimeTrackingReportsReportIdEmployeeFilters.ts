import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReport";
import { IHrmTimeTrackingReportEmployeeFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportEmployeeFilter";
import { IHrmTimeTrackingReportProjectFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportProjectFilter";
import { IHrmTimeTrackingReportTaskFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportTaskFilter";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingReportTransformer } from "../transformers/HrmTimeTrackingReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingReportsReportIdEmployeeFilters(props: {
  reportId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingReport.IUpdateEmployeeFilter;
}): Promise<IHrmTimeTrackingReport> {
  const report =
    await MyGlobal.prisma.hrm_time_tracking_reports.findFirstOrThrow({
      where: {
        id: props.reportId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_tracking_organization_id: true,
        report_type: true,
      },
    });
  if (report.report_type !== "time_report") {
    throw new HttpException(
      "Employee filters are only supported for time reports",
      400,
    );
  }
  if (new Set(props.body.employeeIds).size !== props.body.employeeIds.length) {
    throw new HttpException(
      "Duplicate employee identifiers are not allowed",
      400,
    );
  }
  if (props.body.employeeIds.length !== 0) {
    const employees =
      await MyGlobal.prisma.hrm_time_tracking_employees.findMany({
        where: {
          id: {
            in: props.body.employeeIds,
          },
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
    if (employees.length !== props.body.employeeIds.length) {
      throw new HttpException(
        "Every employee filter must belong to the same organization as the report",
        400,
      );
    }
  }
  const nowText = toISOStringSafe(new globalThis.Date());
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.hrm_time_tracking_report_employee_filters.deleteMany({
      where: {
        hrm_time_tracking_report_id: report.id,
      },
    });
    if (props.body.employeeIds.length !== 0) {
      await tx.hrm_time_tracking_report_employee_filters.createMany({
        data: props.body.employeeIds.map((employeeId) => ({
          id: v4(),
          hrm_time_tracking_report_id: report.id,
          hrm_time_tracking_employee_id: employeeId,
          created_at: new globalThis.Date(nowText),
          updated_at: new globalThis.Date(nowText),
        })),
      });
    }
    await tx.hrm_time_tracking_reports.update({
      where: {
        id: report.id,
      },
      data: {
        updated_at: new globalThis.Date(nowText),
      },
    });
  });
  const refreshed =
    await MyGlobal.prisma.hrm_time_tracking_reports.findFirstOrThrow({
      where: {
        id: report.id,
        deleted_at: null,
      },
      ...HrmTimeTrackingReportTransformer.select(),
    });
  return await HrmTimeTrackingReportTransformer.transform(refreshed);
}
