import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
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
import { ErpHrmTimeWeeklySummaryReportRowAtSummaryTransformer } from "../transformers/ErpHrmTimeWeeklySummaryReportRowAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeMemberOrganizationsOrganizationIdWeeklySummaryReportRows(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IErpHrmTimeWeeklySummaryReportRow.IRequest;
}): Promise<IPageIErpHrmTimeWeeklySummaryReportRow.ISummary> {
  const membership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirst({
      where: {
        erp_hrm_time_member_id: props.member.id,
        organization: {
          id: props.organizationId,
        },
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
      },
    });
  if (membership === null || membership.status !== "active") {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.erp_hrm_time_weekly_summary_report_rowsWhereInput = {
    organization: {
      id: props.organizationId,
    },
    deleted_at: null,
    ...(props.body.weekStartDateFrom !== undefined ||
    props.body.weekStartDateTo !== undefined
      ? {
          week_start_date: {
            ...(props.body.weekStartDateFrom !== undefined && {
              gte: new Date(props.body.weekStartDateFrom),
            }),
            ...(props.body.weekStartDateTo !== undefined && {
              lte: new Date(props.body.weekStartDateTo),
            }),
          },
        }
      : {}),
    ...(props.body.weekEndDateFrom !== undefined ||
    props.body.weekEndDateTo !== undefined
      ? {
          week_end_date: {
            ...(props.body.weekEndDateFrom !== undefined && {
              gte: new Date(props.body.weekEndDateFrom),
            }),
            ...(props.body.weekEndDateTo !== undefined && {
              lte: new Date(props.body.weekEndDateTo),
            }),
          },
        }
      : {}),
  };
  const data =
    await MyGlobal.prisma.erp_hrm_time_weekly_summary_report_rows.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ week_start_date: "asc" }, { organization: { id: "asc" } }],
      ...ErpHrmTimeWeeklySummaryReportRowAtSummaryTransformer.select(),
    });
  const records =
    await MyGlobal.prisma.erp_hrm_time_weekly_summary_report_rows.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmTimeWeeklySummaryReportRowAtSummaryTransformer.transform,
    ),
  };
}
