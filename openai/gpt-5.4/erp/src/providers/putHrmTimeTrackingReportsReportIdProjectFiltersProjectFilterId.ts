import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReport";
import { IHrmTimeTrackingReportProjectFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportProjectFilter";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingReportProjectFilterTransformer } from "../transformers/HrmTimeTrackingReportProjectFilterTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackingReportsReportIdProjectFiltersProjectFilterId(props: {
  reportId: string & tags.Format<"uuid">;
  projectFilterId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingReportProjectFilter.IUpdate;
}): Promise<IHrmTimeTrackingReportProjectFilter> {
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
  const filter =
    await MyGlobal.prisma.hrm_time_tracking_report_project_filters.findFirstOrThrow(
      {
        where: {
          id: props.projectFilterId,
          deleted_at: null,
        },
        select: {
          id: true,
          hrm_time_tracking_report_id: true,
          hrm_time_tracking_project_id: true,
        },
      },
    );
  if (filter.hrm_time_tracking_report_id !== report.id) {
    throw new HttpException("Not Found", 404);
  }
  if (props.body.hrm_time_tracking_project_id !== undefined) {
    const project =
      await MyGlobal.prisma.hrm_time_tracking_projects.findFirstOrThrow({
        where: {
          id: props.body.hrm_time_tracking_project_id,
          deleted_at: null,
        },
        select: {
          id: true,
          hrm_time_tracking_organization_id: true,
        },
      });
    if (
      project.hrm_time_tracking_organization_id !==
      report.hrm_time_tracking_organization_id
    ) {
      throw new HttpException(
        "Project must belong to the same organization as the report",
        400,
      );
    }
    const duplicated =
      await MyGlobal.prisma.hrm_time_tracking_report_project_filters.findFirst({
        where: {
          hrm_time_tracking_report_id: report.id,
          hrm_time_tracking_project_id: props.body.hrm_time_tracking_project_id,
          deleted_at: null,
          id: {
            not: filter.id,
          },
        },
        select: {
          id: true,
        },
      });
    if (duplicated !== null) {
      throw new HttpException("Conflict", 409);
    }
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.hrm_time_tracking_report_project_filters.update({
      where: {
        id: filter.id,
      },
      data: {
        ...(props.body.hrm_time_tracking_project_id !== undefined
          ? {
              hrm_time_tracking_project_id:
                props.body.hrm_time_tracking_project_id,
            }
          : {}),
        updated_at: new Date(),
      },
    });
  });
  const updated =
    await MyGlobal.prisma.hrm_time_tracking_report_project_filters.findFirstOrThrow(
      {
        where: {
          id: filter.id,
          deleted_at: null,
        },
        ...HrmTimeTrackingReportProjectFilterTransformer.select(),
      },
    );
  return await HrmTimeTrackingReportProjectFilterTransformer.transform(updated);
}
