import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeProjectBudgetReportRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProjectBudgetReportRow";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeProjectBudgetReportRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeProjectBudgetReportRow";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeProjectBudgetReportRowAtSummaryTransformer } from "../transformers/ErpHrmTimeProjectBudgetReportRowAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeMemberOrganizationsOrganizationIdProjectBudgetReportRows(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IErpHrmTimeProjectBudgetReportRow.IRequest;
}): Promise<IPageIErpHrmTimeProjectBudgetReportRow.ISummary> {
  const membership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirst({
      where: {
        organization: {
          id: props.organizationId,
        },
        erp_hrm_time_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (membership === null) {
    throw new HttpException("Forbidden", 403);
  }
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where: Prisma.erp_hrm_time_project_budget_report_rowsWhereInput = {
    organization_id: props.organizationId,
    ...(props.body.projectId !== undefined
      ? { project_id: props.body.projectId }
      : {}),
    ...(props.body.reportDateFrom !== undefined ||
    props.body.reportDateTo !== undefined
      ? {
          report_date: {
            ...(props.body.reportDateFrom !== undefined
              ? { gte: props.body.reportDateFrom }
              : {}),
            ...(props.body.reportDateTo !== undefined
              ? { lte: props.body.reportDateTo }
              : {}),
          },
        }
      : {}),
    ...(props.body.periodStartDateFrom !== undefined ||
    props.body.periodStartDateTo !== undefined
      ? {
          period_start_date: {
            ...(props.body.periodStartDateFrom !== undefined
              ? { gte: props.body.periodStartDateFrom }
              : {}),
            ...(props.body.periodStartDateTo !== undefined
              ? { lte: props.body.periodStartDateTo }
              : {}),
          },
        }
      : {}),
    ...(props.body.periodEndDateFrom !== undefined ||
    props.body.periodEndDateTo !== undefined
      ? {
          period_end_date: {
            ...(props.body.periodEndDateFrom !== undefined
              ? { gte: props.body.periodEndDateFrom }
              : {}),
            ...(props.body.periodEndDateTo !== undefined
              ? { lte: props.body.periodEndDateTo }
              : {}),
          },
        }
      : {}),
  };
  const orderBy: Prisma.erp_hrm_time_project_budget_report_rowsOrderByWithRelationInput =
    props.body.sort === "periodStartDateAsc"
      ? { period_start_date: "asc" }
      : props.body.sort === "periodStartDateDesc"
        ? { period_start_date: "desc" }
        : props.body.sort === "periodEndDateAsc"
          ? { period_end_date: "asc" }
          : props.body.sort === "periodEndDateDesc"
            ? { period_end_date: "desc" }
            : props.body.sort === "reportDateAsc"
              ? { report_date: "asc" }
              : { report_date: "desc" };
  const data =
    await MyGlobal.prisma.erp_hrm_time_project_budget_report_rows.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      ...ErpHrmTimeProjectBudgetReportRowAtSummaryTransformer.select(),
    });
  const records =
    await MyGlobal.prisma.erp_hrm_time_project_budget_report_rows.count({
      where,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmTimeProjectBudgetReportRowAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
  };
}
