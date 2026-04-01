import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProject";
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

export async function patchHrmPlatformMemberProjects(props: {
  member: MemberPayload;
  body: IHrmPlatformProject.IRequest;
}): Promise<IPageIHrmPlatformProject.ISummary> {
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        organization_id: true,
      },
    });
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_platform_projectsWhereInput = {
    organization_id: employee.organization_id,
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { name: { contains: props.body.search, mode: "insensitive" } },
        { description: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.created_at_from || props.body.created_at_to
      ? {
          created_at: {
            ...(props.body.created_at_from && {
              gte: new Date(props.body.created_at_from),
            }),
            ...(props.body.created_at_to && {
              lte: new Date(props.body.created_at_to),
            }),
          },
        }
      : {}),
  } satisfies Prisma.hrm_platform_projectsWhereInput;
  const sortField = props.body.sort ?? "created_at";
  const orderDirection = props.body.order ?? "desc";
  const orderByInput: Prisma.hrm_platform_projectsOrderByWithRelationInput = {
    [sortField]: orderDirection,
  } satisfies Prisma.hrm_platform_projectsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.hrm_platform_projects.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      name: true,
      color_code: true,
      status: true,
      budget_hours: true,
      start_date: true,
      end_date: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.hrm_platform_projects.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map(
      (project) =>
        ({
          id: project.id,
          name: project.name,
          color_code: project.color_code,
          status: project.status,
          budget_hours:
            project.budget_hours === null ? null : project.budget_hours,
          start_date:
            project.start_date === null
              ? null
              : toISOStringSafe(project.start_date),
          end_date:
            project.end_date === null
              ? null
              : toISOStringSafe(project.end_date),
          created_at: toISOStringSafe(project.created_at),
        }) satisfies IHrmPlatformProject.ISummary,
    ),
  } satisfies IPageIHrmPlatformProject.ISummary;
}
