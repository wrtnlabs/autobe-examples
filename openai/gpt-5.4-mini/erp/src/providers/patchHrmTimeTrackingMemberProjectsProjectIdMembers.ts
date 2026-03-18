import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMembership";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingProjectMembership";
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

export async function patchHrmTimeTrackingMemberProjectsProjectIdMembers(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingProjectMembership.IRequest;
}): Promise<IPageIHrmTimeTrackingProjectMembership.ISummary> {
  await MyGlobal.prisma.hrm_time_tracking_projects.findUniqueOrThrow({
    where: {
      id: props.projectId,
      organization_id: (
        props.member as MemberPayload & {
          organization: {
            id: string;
          };
        }
      ).organization.id,
    },
    select: {
      id: true,
    },
  });
  const page: number = props.body.page ?? 1;
  const pageSize: number = props.body.pageSize ?? props.body.limit ?? 20;
  const skip: number = (page - 1) * pageSize;
  const where: Prisma.hrm_time_tracking_project_membershipsWhereInput = {
    project: {
      is: {
        id: props.projectId,
      },
    },
    deleted_at: null,
    ...(props.body.search === undefined || props.body.search === ""
      ? {}
      : {
          OR: [
            {
              employee: {
                position_title: {
                  contains: props.body.search,
                  mode: "insensitive",
                },
              },
            },
            {
              employee: {
                status: {
                  contains: props.body.search,
                  mode: "insensitive",
                },
              },
            },
            {
              employee: {
                role: {
                  name: {
                    contains: props.body.search,
                    mode: "insensitive",
                  },
                },
              },
            },
          ],
        }),
  };
  const rows =
    await MyGlobal.prisma.hrm_time_tracking_project_memberships.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [
        {
          created_at: "asc",
        },
        {
          employee: {
            id: "asc",
          },
        },
      ],
      select: {
        id: true,
        is_project_lead: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employee: {
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
            userAccount: {
              select: {},
            },
            role: {
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
                code: true,
                description: true,
                is_builtin: true,
                sort_order: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
            department: {
              select: {
                id: true,
                name: true,
                description: true,
                parent_department_id: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
            position_title: true,
            employment_type: true,
            status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });
  const total: number =
    await MyGlobal.prisma.hrm_time_tracking_project_memberships.count({
      where,
    });
  return {
    data: rows.map((row) => ({
      id: row.id,
      employee: {
        id: row.employee.id,
        organization: {
          id: row.employee.organization.id,
          name: row.employee.organization.name,
          description: row.employee.organization.description,
          logoImageUrl: row.employee.organization.logo_image_url,
          currency: row.employee.organization.currency,
          timezone: row.employee.organization.timezone,
          fiscalStartMonth: row.employee.organization.fiscal_start_month,
          createdAt: toISOStringSafe(row.employee.organization.created_at),
          updatedAt: toISOStringSafe(row.employee.organization.updated_at),
          deletedAt:
            row.employee.organization.deleted_at === null
              ? null
              : toISOStringSafe(row.employee.organization.deleted_at),
        },
        userAccount: {},
        role: {
          id: row.employee.role.id,
          organization: {
            id: row.employee.role.organization.id,
            name: row.employee.role.organization.name,
            description: row.employee.role.organization.description,
            logoImageUrl: row.employee.role.organization.logo_image_url,
            currency: row.employee.role.organization.currency,
            timezone: row.employee.role.organization.timezone,
            fiscalStartMonth: row.employee.role.organization.fiscal_start_month,
            createdAt: toISOStringSafe(
              row.employee.role.organization.created_at,
            ),
            updatedAt: toISOStringSafe(
              row.employee.role.organization.updated_at,
            ),
            deletedAt:
              row.employee.role.organization.deleted_at === null
                ? null
                : toISOStringSafe(row.employee.role.organization.deleted_at),
          },
          name: row.employee.role.name,
          code: row.employee.role.code,
          description: row.employee.role.description,
          isBuiltin: row.employee.role.is_builtin,
          sortOrder: row.employee.role.sort_order,
          createdAt: toISOStringSafe(row.employee.role.created_at),
          updatedAt: toISOStringSafe(row.employee.role.updated_at),
          deletedAt:
            row.employee.role.deleted_at === null
              ? null
              : toISOStringSafe(row.employee.role.deleted_at),
        },
        department:
          row.employee.department === null
            ? null
            : {
                id: row.employee.department.id,
                name: row.employee.department.name,
                description: row.employee.department.description,
                parentDepartmentId:
                  row.employee.department.parent_department_id,
                created_at: toISOStringSafe(row.employee.department.created_at),
                updated_at: toISOStringSafe(row.employee.department.updated_at),
                deletedAt:
                  row.employee.department.deleted_at === null
                    ? null
                    : toISOStringSafe(row.employee.department.deleted_at),
              },
        positionTitle: row.employee.position_title,
        employmentType: row.employee.employment_type,
        status: row.employee.status,
        createdAt: toISOStringSafe(row.employee.created_at),
        updatedAt: toISOStringSafe(row.employee.updated_at),
        deletedAt:
          row.employee.deleted_at === null
            ? null
            : toISOStringSafe(row.employee.deleted_at),
      },
      isProjectLead: row.is_project_lead,
      createdAt: toISOStringSafe(row.created_at),
      updatedAt: toISOStringSafe(row.updated_at),
      deletedAt:
        row.deleted_at === null ? null : toISOStringSafe(row.deleted_at),
    })),
    pagination: {
      current: page,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
    },
  };
}
