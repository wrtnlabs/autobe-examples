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
import { EmployeePayload } from "../decorators/payload/EmployeePayload";
import { HrmTimeTrackingReportTransformer } from "../transformers/HrmTimeTrackingReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackingEmployeeDashboard(props: {
  employee: EmployeePayload;
}): Promise<IHrmTimeTrackingReport> {
  const employee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findUniqueOrThrow({
      where: {
        id: props.employee.id,
      },
      select: {
        id: true,
        deleted_at: true,
      },
    });
  if (employee.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  const session =
    await MyGlobal.prisma.hrm_time_tracking_employee_sessions.findFirstOrThrow({
      where: {
        id: props.employee.session_id,
        hrm_time_tracking_employee_id: props.employee.id,
        logged_out_at: null,
      },
      select: {
        id: true,
        hrm_time_tracking_organization_id: true,
      },
    });
  if (session.id.length === 0) {
    throw new HttpException("Forbidden", 403);
  }
  if (session.hrm_time_tracking_organization_id === null) {
    throw new HttpException("Forbidden", 403);
  }
  const reportQuery = {
    where: {
      hrm_time_tracking_organization_id:
        session.hrm_time_tracking_organization_id,
      deleted_at: null,
      report_type: "employee_dashboard",
    },
    orderBy: {
      updated_at: "desc",
    },
    ...HrmTimeTrackingReportTransformer.select(),
  } satisfies Parameters<
    typeof MyGlobal.prisma.hrm_time_tracking_reports.findFirstOrThrow
  >[0];
  const report =
    await MyGlobal.prisma.hrm_time_tracking_reports.findFirstOrThrow(
      reportQuery,
    );
  return await HrmTimeTrackingReportTransformer.transform(report);
}
