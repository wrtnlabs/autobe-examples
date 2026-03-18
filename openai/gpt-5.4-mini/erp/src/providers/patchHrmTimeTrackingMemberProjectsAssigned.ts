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

export async function patchHrmTimeTrackingMemberProjectsAssigned(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingProject.IRequest;
}): Promise<IPageIHrmTimeTrackingProject.ISummary> {
  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      user_account_id: props.member.id,
      deleted_at: null,
      organization: {
        deleted_at: null,
      },
    },
    select: {
      id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Unauthorized", 401);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.hrm_time_tracking_project_membershipsWhereInput = {
    hrm_time_tracking_employee_id: employee.id,
    deleted_at: null,
    project: {
      deleted_at: null,
      ...(props.body.search !== undefined
        ? {
            OR: [
              {
                name: {
                  contains: props.body.search,
                  mode: "insensitive",
                },
              },
              {
                description: {
                  contains: props.body.search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
      ...(props.body.status !== undefined ? { status: props.body.status } : {}),
    },
  };
  const orderBy = {
    project: {
      created_at: "desc",
    },
  } satisfies Prisma.hrm_time_tracking_project_membershipsOrderByWithRelationInput;
  const memberships =
    await MyGlobal.prisma.hrm_time_tracking_project_memberships.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        project: {
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
        },
      },
    });
  const total =
    await MyGlobal.prisma.hrm_time_tracking_project_memberships.count({
      where,
    });
  return {
    data: memberships.map(
      (membership) =>
        ({
          id: membership.project.id,
          organization: {
            id: membership.project.organization.id,
            name: membership.project.organization.name,
            description: membership.project.organization.description,
            logoImageUrl: membership.project.organization.logo_image_url,
            currency: membership.project.organization.currency,
            timezone: membership.project.organization.timezone,
            fiscalStartMonth:
              membership.project.organization.fiscal_start_month,
            createdAt: membership.project.organization.created_at.toISOString(),
            updatedAt: membership.project.organization.updated_at.toISOString(),
            deletedAt:
              membership.project.organization.deleted_at?.toISOString() ?? null,
          } satisfies IHrmTimeTrackingOrganization.ISummary,
          name: membership.project.name,
          description: membership.project.description,
          colorCode: membership.project.color_code,
          status: membership.project.status,
          budgetHours: membership.project.budget_hours,
          startDate: membership.project.start_date?.toISOString() ?? null,
          endDate: membership.project.end_date?.toISOString() ?? null,
          createdAt: membership.project.created_at.toISOString(),
          updatedAt: membership.project.updated_at.toISOString(),
          deletedAt: membership.project.deleted_at?.toISOString() ?? null,
        }) satisfies IHrmTimeTrackingProject.ISummary,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
