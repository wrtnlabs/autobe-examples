import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import { IErpHrmTimeTimeReportRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimeReportRow";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeTimeReportRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTimeReportRow";
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

export async function patchErpHrmTimeMemberReportsTimeReportRows(props: {
  member: MemberPayload;
  body: IErpHrmTimeTimeReportRow.IRequest;
}): Promise<IPageIErpHrmTimeTimeReportRow.ISummary> {
  const organizationMembership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirstOrThrow(
      {
        where: {
          erp_hrm_time_member_id: props.member.id,
          is_selected_context: true,
          deleted_at: null,
        },
        select: {
          erp_hrm_time_organization_id: true,
        },
      },
    );
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where: Prisma.erp_hrm_time_time_report_rowsWhereInput = {
    organization_id: organizationMembership.erp_hrm_time_organization_id,
    deleted_at: null,
    report_date: {
      gte: props.body.fromDate,
      lte: props.body.toDate,
    },
    ...(props.body.employeeId !== undefined
      ? { employee_id: props.body.employeeId }
      : {}),
    ...(props.body.projectId !== undefined
      ? { project_id: props.body.projectId }
      : {}),
    ...(props.body.billable !== undefined
      ? { billable: props.body.billable }
      : {}),
    ...(props.body.groupBy === "employee"
      ? { employee_id: { not: null } }
      : props.body.groupBy === "project"
        ? { project_id: { not: null } }
        : props.body.groupBy === "task"
          ? { task_id: { not: null } }
          : {}),
  };
  const total = await MyGlobal.prisma.erp_hrm_time_time_report_rows.count({
    where,
  });
  const rows = await MyGlobal.prisma.erp_hrm_time_time_report_rows.findMany({
    where,
    skip,
    take: limit,
    orderBy: [
      { report_date: "asc" },
      { employee_id: "asc" },
      { project_id: "asc" },
      { task_id: "asc" },
      { billable: "asc" },
      { id: "asc" },
    ],
    select: {
      id: true,
      organization_id: true,
      employee_id: true,
      project_id: true,
      task_id: true,
      report_date: true,
      billable: true,
      logged_minutes: true,
      logged_hours: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map(
      (row) =>
        ({
          id: row.id,
          organization: {
            id: row.organization_id,
          } satisfies IErpHrmTimeOrganization.ISummary,
          employee: null,
          project: null,
          task: null,
          reportDate: row.report_date.toISOString(),
          billable: row.billable,
          loggedMinutes: row.logged_minutes,
          loggedHours: row.logged_hours,
          createdAt: row.created_at.toISOString(),
          updatedAt: row.updated_at.toISOString(),
          deletedAt: row.deleted_at?.toISOString() ?? null,
        }) satisfies IErpHrmTimeTimeReportRow.ISummary,
    ),
  };
}
