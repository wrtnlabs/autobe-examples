import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
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
import { ErpHrmTimeTimeReportRowAtSummaryTransformer } from "../transformers/ErpHrmTimeTimeReportRowAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeMemberOrganizationsOrganizationIdTimeReportRows(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTimeReportRow.IRequest;
}): Promise<IPageIErpHrmTimeTimeReportRow.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const membership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirstOrThrow(
      {
        where: {
          erp_hrm_time_member_id: props.member.id,
          erp_hrm_time_organization_id: props.organizationId,
          deleted_at: null,
        },
        select: {
          id: true,
          status: true,
          is_selected_context: true,
        },
      },
    );
  if (
    membership.status !== "active" ||
    membership.is_selected_context !== true
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const where: Prisma.erp_hrm_time_time_report_rowsWhereInput = {
    organization_id: props.organizationId,
    deleted_at: null,
    ...(props.body.reportDateFrom !== undefined &&
    props.body.reportDateFrom !== null
      ? { report_date: { gte: props.body.reportDateFrom } }
      : {}),
    ...(props.body.reportDateTo !== undefined &&
    props.body.reportDateTo !== null
      ? {
          report_date: {
            ...(props.body.reportDateFrom !== undefined &&
            props.body.reportDateFrom !== null
              ? { gte: props.body.reportDateFrom }
              : {}),
            lte: props.body.reportDateTo,
          },
        }
      : {}),
    ...(props.body.employeeId !== undefined && props.body.employeeId !== null
      ? { employee_id: props.body.employeeId }
      : {}),
    ...(props.body.projectId !== undefined && props.body.projectId !== null
      ? { project_id: props.body.projectId }
      : {}),
    ...(props.body.taskId !== undefined && props.body.taskId !== null
      ? { task_id: props.body.taskId }
      : {}),
    ...(props.body.billable !== undefined && props.body.billable !== null
      ? { billable: props.body.billable }
      : {}),
  };
  const orderBy: Prisma.erp_hrm_time_time_report_rowsOrderByWithRelationInput =
    props.body.sort === "reportDateAsc"
      ? { report_date: "asc" }
      : { report_date: "desc" };
  const data = await MyGlobal.prisma.erp_hrm_time_time_report_rows.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    ...ErpHrmTimeTimeReportRowAtSummaryTransformer.select(),
  });
  const records = await MyGlobal.prisma.erp_hrm_time_time_report_rows.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: records,
      pages: Math.ceil(records / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmTimeTimeReportRowAtSummaryTransformer.transform,
    ),
  };
}
