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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberOrganizationsOrganizationIdReports(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IErpHrmReport.IRequest;
}): Promise<IPageIErpHrmReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build created_at range filter using let to allow reassignment
  let createdAtFilter:
    | Prisma.erp_hrm_reportsWhereInput["created_at"]
    | undefined;
  if (
    props.body.start_date !== undefined &&
    props.body.end_date !== undefined
  ) {
    createdAtFilter = {
      gte: new Date(props.body.start_date),
      lte: new Date(props.body.end_date),
    };
  } else if (props.body.start_date !== undefined) {
    createdAtFilter = { gte: new Date(props.body.start_date) };
  } else if (props.body.end_date !== undefined) {
    createdAtFilter = { lte: new Date(props.body.end_date) };
  }
  const whereInput: Prisma.erp_hrm_reportsWhereInput = {
    erp_hrm_organization_id: props.organizationId,
    ...(props.body.report_type != null && {
      report_type: props.body.report_type,
    }),
    ...(props.body.name != null && {
      name: { contains: props.body.name, mode: "insensitive" },
    }),
    ...(createdAtFilter !== undefined && {
      created_at: createdAtFilter,
    }),
    ...(props.body.generated_by_member_id != null && {
      generated_by_erp_hrm_member_id: props.body.generated_by_member_id,
    }),
  };
  const data = await MyGlobal.prisma.erp_hrm_reports.findMany({
    where: whereInput,
    skip: skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      report_type: true,
      name: true,
      created_at: true,
      updated_at: true,
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
  const total = await MyGlobal.prisma.erp_hrm_reports.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(data, async (item) => ({
    id: item.id,
    report_type: item.report_type,
    name: item.name ?? undefined,
    created_at: item.created_at.toISOString(),
    generatedByMember: {
      id: item.generatedByMember.id,
      email: item.generatedByMember.email,
      displayName: item.generatedByMember.display_name,
      avatarUri: item.generatedByMember.avatar_uri ?? undefined,
      phone: item.generatedByMember.phone ?? undefined,
      createdAt: item.generatedByMember.created_at.toISOString(),
    },
  }));
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
