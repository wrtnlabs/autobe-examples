import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmAdminOrganizationsOrganizationIdReports(props: {
  admin: AdminPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IErpHrmReport.IRequest;
}): Promise<IPageIErpHrmReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause with data isolation and filters
  const whereConditions: Prisma.erp_hrm_reportsWhereInput[] = [];
  // Always filter by organization (data isolation)
  whereConditions.push({
    erp_hrm_organization_id: props.organizationId,
  });
  // Filter by report_type if provided
  if (props.body.report_type !== undefined && props.body.report_type !== null) {
    whereConditions.push({
      report_type: props.body.report_type,
    });
  }
  // Filter by name (partial match) if provided
  if (props.body.name !== undefined && props.body.name !== null) {
    whereConditions.push({
      name: {
        contains: props.body.name,
        mode: "insensitive",
      },
    });
  }
  // Filter by date range if provided
  if (
    props.body.start_date !== undefined ||
    props.body.end_date !== undefined
  ) {
    const dateFilter: Prisma.DateTimeFilter<"erp_hrm_reports"> = {};
    if (props.body.start_date !== undefined) {
      dateFilter.gte = new Date(props.body.start_date);
    }
    if (props.body.end_date !== undefined) {
      dateFilter.lte = new Date(props.body.end_date);
    }
    whereConditions.push({
      created_at: dateFilter,
    });
  }
  // Filter by generated_by_member_id if provided
  if (props.body.generated_by_member_id !== undefined) {
    whereConditions.push({
      generated_by_erp_hrm_member_id: props.body.generated_by_member_id,
    });
  }
  const whereInput = {
    AND: whereConditions,
  } satisfies Prisma.erp_hrm_reportsWhereInput;
  // Execute findMany with join to erp_hrm_members
  const reports = await MyGlobal.prisma.erp_hrm_reports.findMany({
    where: whereInput,
    skip: skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      report_type: true,
      name: true,
      created_at: true,
      generatedByMember: {
        select: {
          id: true,
          email: true,
          display_name: true,
          avatar_uri: true,
          phone: true,
          created_at: true,
        },
      },
    },
  });
  // Execute count query (sequential, not parallel)
  const total = await MyGlobal.prisma.erp_hrm_reports.count({
    where: whereInput,
  });
  // Transform results to response DTOs
  const data: IErpHrmReport.ISummary[] = reports.map((report) => ({
    id: report.id as string & tags.Format<"uuid">,
    report_type: report.report_type,
    name: report.name,
    created_at: toISOStringSafe(report.created_at),
    generatedByMember: {
      id: report.generatedByMember.id as string & tags.Format<"uuid">,
      email: report.generatedByMember.email as string & tags.Format<"email">,
      displayName: report.generatedByMember.display_name,
      avatarUri: report.generatedByMember.avatar_uri,
      phone: report.generatedByMember.phone,
      createdAt: toISOStringSafe(report.generatedByMember.created_at),
    } satisfies IErpHrmMember.ISummary,
  }));
  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIErpHrmReport.ISummary;
}
