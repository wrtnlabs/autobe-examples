import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeWeeklySummaryReportRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeWeeklySummaryReportRow";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeWeeklySummaryReportRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeWeeklySummaryReportRow";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeMemberReportsWeeklySummaryReportRows(props: {
  member: MemberPayload;
  body: IErpHrmTimeWeeklySummaryReportRow.IRequest;
}): Promise<IPageIErpHrmTimeWeeklySummaryReportRow.ISummary> {
  const organizationId =
    (
      props.member as unknown as {
        selected_organization_id?: (string & tags.Format<"uuid">) | undefined;
        organization_id?: (string & tags.Format<"uuid">) | undefined;
        selectedOrganizationId?: (string & tags.Format<"uuid">) | undefined;
      }
    ).selected_organization_id ??
    (
      props.member as unknown as {
        selected_organization_id?: (string & tags.Format<"uuid">) | undefined;
        organization_id?: (string & tags.Format<"uuid">) | undefined;
        selectedOrganizationId?: (string & tags.Format<"uuid">) | undefined;
      }
    ).organization_id ??
    (
      props.member as unknown as {
        selected_organization_id?: (string & tags.Format<"uuid">) | undefined;
        organization_id?: (string & tags.Format<"uuid">) | undefined;
        selectedOrganizationId?: (string & tags.Format<"uuid">) | undefined;
      }
    ).selectedOrganizationId;
  if (organizationId === undefined)
    throw new HttpException("Organization context not selected", 400);
  const canViewReports = props.member as unknown as {
    permissions?: string[] | undefined;
    permission_codes?: string[] | undefined;
    role?:
      | {
          permissions?: string[] | undefined;
        }
      | undefined;
  };
  const permissions =
    canViewReports.permissions ??
    canViewReports.permission_codes ??
    canViewReports.role?.permissions ??
    [];
  if (
    !permissions.includes("report_viewing") &&
    !permissions.includes("report viewing") &&
    !permissions.includes("report-viewing")
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    organization_id: organizationId,
    deleted_at: null,
    week_start_date: {
      gte: new Date(props.body.dateFrom),
    },
    week_end_date: {
      lte: new Date(props.body.dateTo),
    },
    ...(props.body.project_id !== undefined
      ? { project_id: props.body.project_id }
      : {}),
  } satisfies Prisma.erp_hrm_time_weekly_summary_report_rowsWhereInput;
  const orderBy = (
    props.body.sort === "week_start_date_asc"
      ? { week_start_date: "asc" as const }
      : props.body.sort === "week_start_date_desc"
        ? { week_start_date: "desc" as const }
        : { week_start_date: "desc" as const }
  ) satisfies Prisma.erp_hrm_time_weekly_summary_report_rowsOrderByWithRelationInput;
  const rows =
    await MyGlobal.prisma.erp_hrm_time_weekly_summary_report_rows.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        organization: { select: {} },
        week_start_date: true,
        week_end_date: true,
        total_hours: true,
        timelog_count: true,
        active_employee_count: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const total =
    await MyGlobal.prisma.erp_hrm_time_weekly_summary_report_rows.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(rows, async (row) => ({
      id: row.id,
      organization: {} satisfies IErpHrmTimeOrganization.ISummary,
      weekStartDate: row.week_start_date.toISOString(),
      weekEndDate: row.week_end_date.toISOString(),
      totalHours: row.total_hours,
      timelogCount: row.timelog_count,
      activeEmployeeCount: row.active_employee_count,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      deletedAt: row.deleted_at?.toISOString() ?? null,
    })),
  };
}
