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

export async function postHrmTimeTrackingReportsReportIdProjectFilters(props: {
  reportId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingReportProjectFilter.ICreate;
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
      },
    });
  const projects = await MyGlobal.prisma.hrm_time_tracking_projects.findMany({
    where: {
      id: {
        in: props.body.projectIds,
      },
      hrm_time_tracking_organization_id:
        report.hrm_time_tracking_organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (projects.length !== props.body.projectIds.length) {
    throw new HttpException(
      "One or more projects do not exist in the report organization.",
      400,
    );
  }
  const existing =
    await MyGlobal.prisma.hrm_time_tracking_report_project_filters.findMany({
      where: {
        hrm_time_tracking_report_id: report.id,
        hrm_time_tracking_project_id: {
          in: props.body.projectIds,
        },
        deleted_at: null,
      },
      select: {
        hrm_time_tracking_project_id: true,
      },
    });
  if (existing.length !== 0) {
    throw new HttpException(
      "One or more projects are already included in the saved report filter set.",
      409,
    );
  }
  const now = new globalThis.Date();
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.hrm_time_tracking_report_project_filters.createMany({
      data: props.body.projectIds.map((projectId) => ({
        id: v4(),
        hrm_time_tracking_report_id: report.id,
        hrm_time_tracking_project_id: projectId,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      })),
    }),
  ]);
  const updated =
    await MyGlobal.prisma.hrm_time_tracking_reports.findUniqueOrThrow({
      where: {
        id: report.id,
      },
      ...HrmTimeTrackingReportTransformer.select(),
    });
  return await HrmTimeTrackingReportTransformer.transform(updated);
}
