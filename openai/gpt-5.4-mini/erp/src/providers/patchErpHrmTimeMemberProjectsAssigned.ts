import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeProjectAtSummaryTransformer } from "../transformers/ErpHrmTimeProjectAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeMemberProjectsAssigned(props: {
  member: MemberPayload;
  body: IErpHrmTimeProject.IRequest;
}): Promise<IPageIErpHrmTimeProject.ISummary> {
  const employee = await MyGlobal.prisma.erp_hrm_time_employees.findFirst({
    where: {
      erp_hrm_time_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_time_organization_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const search = props.body.search?.trim();
  const where = {
    deleted_at: null,
    organization: {
      id: employee.erp_hrm_time_organization_id,
    },
    projectMemberships: {
      some: {
        deleted_at: null,
        employee: {
          id: employee.id,
          deleted_at: null,
          erp_hrm_time_organization_id: employee.erp_hrm_time_organization_id,
        },
      },
    },
    ...(props.body.status !== undefined ? { status: props.body.status } : {}),
    ...(search !== undefined && search.length > 0
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { description: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  } satisfies Prisma.erp_hrm_time_projectsWhereInput;
  const orderBy = (
    props.body.sort === "name"
      ? [{ name: "asc" as const }, { created_at: "desc" as const }]
      : props.body.sort === "updated_at"
        ? [{ updated_at: "desc" as const }, { created_at: "desc" as const }]
        : [{ created_at: "desc" as const }, { id: "desc" as const }]
  ) satisfies Prisma.erp_hrm_time_projectsOrderByWithRelationInput[];
  const data = await MyGlobal.prisma.erp_hrm_time_projects.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...ErpHrmTimeProjectAtSummaryTransformer.select(),
  });
  const records = await MyGlobal.prisma.erp_hrm_time_projects.count({
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
      ErpHrmTimeProjectAtSummaryTransformer.transform,
    ),
  };
}
