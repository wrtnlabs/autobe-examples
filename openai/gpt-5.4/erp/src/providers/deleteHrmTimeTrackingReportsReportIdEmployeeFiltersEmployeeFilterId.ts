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

export async function deleteHrmTimeTrackingReportsReportIdEmployeeFiltersEmployeeFilterId(props: {
  reportId: string & tags.Format<"uuid">;
  employeeFilterId: string & tags.Format<"uuid">;
}): Promise<void> {
  const report =
    await MyGlobal.prisma.hrm_time_tracking_reports.findFirstOrThrow({
      where: {
        id: props.reportId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  const employeeFilter =
    await MyGlobal.prisma.hrm_time_tracking_report_employee_filters.findFirstOrThrow(
      {
        where: {
          id: props.employeeFilterId,
          hrm_time_tracking_report_id: report.id,
        },
        select: {
          id: true,
        },
      },
    );
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.hrm_time_tracking_report_employee_filters.delete({
      where: {
        id: employeeFilter.id,
      },
    }),
    MyGlobal.prisma.hrm_time_tracking_reports.update({
      where: {
        id: report.id,
      },
      data: {
        updated_at: new Date(),
      },
    }),
  ]);
}
