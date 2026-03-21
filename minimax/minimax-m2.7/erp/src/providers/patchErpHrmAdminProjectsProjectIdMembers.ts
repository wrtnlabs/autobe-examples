import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmProjectMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmProjectMemberAtSummaryTransformer } from "../transformers/ErpHrmProjectMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmAdminProjectsProjectIdMembers(props: {
  admin: AdminPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmProjectMember.IRequest;
}): Promise<IPageIErpHrmProjectMember.ISummary> {
  // Validate project exists
  await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: { id: true },
  });
  // Build where clause from request filters
  const whereInput = {
    id: props.projectId,
    ...(props.body.name && { name: { contains: props.body.name } }),
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.start_date_from && {
      start_date: { gte: new Date(props.body.start_date_from) },
    }),
    ...(props.body.start_date_to && {
      start_date: {
        ...(props.body.start_date_from
          ? { gte: new Date(props.body.start_date_from) }
          : {}),
        lte: new Date(props.body.start_date_to),
      },
    }),
    ...(props.body.end_date_from && {
      end_date: { gte: new Date(props.body.end_date_from) },
    }),
    ...(props.body.end_date_to && {
      end_date: {
        ...(props.body.end_date_from
          ? { gte: new Date(props.body.end_date_from) }
          : {}),
        lte: new Date(props.body.end_date_to),
      },
    }),
    ...(props.body.budget_hours_min !== undefined && {
      budget_hours: { gte: props.body.budget_hours_min },
    }),
    ...(props.body.budget_hours_max !== undefined && {
      budget_hours: {
        ...(props.body.budget_hours_min !== undefined
          ? { gte: props.body.budget_hours_min }
          : {}),
        lte: props.body.budget_hours_max,
      },
    }),
  } satisfies Prisma.erp_hrm_projectsWhereInput;
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Query projects with transformer
  const data = await MyGlobal.prisma.erp_hrm_projects.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ErpHrmProjectMemberAtSummaryTransformer.select(),
  });
  // Query total count
  const total = await MyGlobal.prisma.erp_hrm_projects.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    ErpHrmProjectMemberAtSummaryTransformer.transform,
  );
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
