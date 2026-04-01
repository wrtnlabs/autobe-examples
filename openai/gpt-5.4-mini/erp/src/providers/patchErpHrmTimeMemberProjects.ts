import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeMemberProjects(props: {
  member: MemberPayload;
  body: IErpHrmTimeProject.IRequest;
}): Promise<IPageIErpHrmTimeProject.ISummary> {
  const organizationMembership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirst({
      where: {
        erp_hrm_time_member_id: props.member.id,
        is_selected_context: true,
        deleted_at: null,
        status: "active",
      },
      select: {
        erp_hrm_time_organization_id: true,
      },
    });
  if (organizationMembership === null)
    throw new HttpException(
      "Selected organization context is missing or invalid",
      403,
    );
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const where = {
    erp_hrm_time_organization_id:
      organizationMembership.erp_hrm_time_organization_id,
    deleted_at: null,
    ...(props.body.status !== undefined ? { status: props.body.status } : {}),
    ...(props.body.search !== undefined
      ? {
          OR: [
            { name: { contains: props.body.search, mode: "insensitive" } },
            {
              description: { contains: props.body.search, mode: "insensitive" },
            },
          ],
        }
      : {}),
  } satisfies Prisma.erp_hrm_time_projectsWhereInput;
  const orderBy = (
    props.body.sort === "name"
      ? [{ name: "asc" as const }, { id: "asc" as const }]
      : props.body.sort === "status"
        ? [{ status: "asc" as const }, { id: "asc" as const }]
        : props.body.sort === "updatedAt"
          ? [{ updated_at: "desc" as const }, { id: "desc" as const }]
          : [{ created_at: "desc" as const }, { id: "desc" as const }]
  ) satisfies Prisma.erp_hrm_time_projectsOrderByWithRelationInput[];
  const data = await MyGlobal.prisma.erp_hrm_time_projects.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      name: true,
      description: true,
      color_code: true,
      status: true,
      budget_hours: true,
      start_date: true,
      end_date: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const total = await MyGlobal.prisma.erp_hrm_time_projects.count({ where });
  return {
    data: data.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      colorCode: project.color_code,
      status: project.status,
      budgetHours: project.budget_hours,
      startDate: project.start_date?.toISOString() ?? null,
      endDate: project.end_date?.toISOString() ?? null,
      organization: {},
      createdAt: project.created_at.toISOString(),
      updatedAt: project.updated_at.toISOString(),
      deletedAt: project.deleted_at?.toISOString() ?? null,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
