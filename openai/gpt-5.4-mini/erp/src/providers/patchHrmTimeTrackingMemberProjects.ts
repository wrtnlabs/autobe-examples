import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingProject";
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

export async function patchHrmTimeTrackingMemberProjects(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingProject.IRequest;
}): Promise<IPageIHrmTimeTrackingProject.ISummary> {
  const employee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findFirstOrThrow({
      where: {
        user_account_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
      },
    });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    organization_id: employee.organization_id,
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
  } satisfies Prisma.hrm_time_tracking_projectsWhereInput;
  const orderBy = (() => {
    switch (props.body.sort) {
      case "name_asc":
        return [{ name: "asc" as const }, { id: "asc" as const }];
      case "name_desc":
        return [{ name: "desc" as const }, { id: "asc" as const }];
      case "status_asc":
        return [
          { status: "asc" as const },
          { created_at: "desc" as const },
          { id: "asc" as const },
        ];
      case "status_desc":
        return [
          { status: "desc" as const },
          { created_at: "desc" as const },
          { id: "asc" as const },
        ];
      case "start_date_asc":
        return [{ start_date: "asc" as const }, { id: "asc" as const }];
      case "start_date_desc":
        return [{ start_date: "desc" as const }, { id: "asc" as const }];
      case "end_date_asc":
        return [{ end_date: "asc" as const }, { id: "asc" as const }];
      case "end_date_desc":
        return [{ end_date: "desc" as const }, { id: "asc" as const }];
      default:
        return [{ created_at: "desc" as const }, { id: "asc" as const }];
    }
  })() satisfies Prisma.hrm_time_tracking_projectsOrderByWithRelationInput[];
  const projects = await MyGlobal.prisma.hrm_time_tracking_projects.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    select: {
      id: true,
      organization: {
        select: {
          id: true,
          name: true,
          description: true,
          logo_image_url: true,
          currency: true,
          timezone: true,
          fiscal_start_month: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
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
  const records = await MyGlobal.prisma.hrm_time_tracking_projects.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
    data: projects.map(
      (project) =>
        ({
          id: project.id,
          organization: {
            id: project.organization.id,
            name: project.organization.name,
            description: project.organization.description,
            logoImageUrl: project.organization.logo_image_url,
            currency: project.organization.currency,
            timezone: project.organization.timezone,
            fiscalStartMonth: project.organization.fiscal_start_month,
            createdAt: project.organization.created_at.toISOString(),
            updatedAt: project.organization.updated_at.toISOString(),
            deletedAt:
              project.organization.deleted_at === null
                ? null
                : project.organization.deleted_at.toISOString(),
          } satisfies IHrmTimeTrackingOrganization.ISummary,
          name: project.name,
          description: project.description,
          colorCode: project.color_code,
          status: project.status,
          budgetHours: project.budget_hours,
          startDate:
            project.start_date === null
              ? null
              : project.start_date.toISOString(),
          endDate:
            project.end_date === null ? null : project.end_date.toISOString(),
          createdAt: project.created_at.toISOString(),
          updatedAt: project.updated_at.toISOString(),
          deletedAt:
            project.deleted_at === null
              ? null
              : project.deleted_at.toISOString(),
        }) satisfies IHrmTimeTrackingProject.ISummary,
    ),
  };
}
