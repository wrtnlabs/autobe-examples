import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProjectMember";
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

export async function patchHrmPlatformMemberProjectsProjectIdMembers(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmPlatformProjectMember.IRequest;
}): Promise<IPageIHrmPlatformProjectMember.ISummary> {
  // Verify project exists
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: { id: props.projectId },
      select: { id: true, hrm_platform_organization_id: true },
    },
  );
  // Verify member belongs to the project's organization
  const memberEmployee = await MyGlobal.prisma.hrm_platform_employees.findFirst(
    {
      where: {
        hrm_platform_user_id: props.member.id,
        hrm_platform_organization_id: project.hrm_platform_organization_id,
        deleted_at: null,
      },
    },
  );
  if (!memberEmployee) {
    throw new HttpException("Forbidden", 403);
  }
  // Build where clause for filtering
  const whereInput: Prisma.hrm_platform_project_membersWhereInput = {
    hrm_platform_project_id: props.projectId,
    deleted_at: null,
    AND: [
      // Employee must not be deleted
      {
        employee: {
          deleted_at: null,
        },
      },
    ],
  };
  // Apply role filter
  if (props.body.role !== undefined) {
    whereInput.role = props.body.role;
  }
  // Apply search filter on employee name
  if (props.body.search !== undefined && props.body.search.length > 0) {
    if (whereInput.AND && Array.isArray(whereInput.AND)) {
      whereInput.AND.push({
        employee: {
          user: {
            deleted_at: null,
            display_name: {
              contains: props.body.search,
            },
          },
        },
      });
    }
  }
  // Apply date range filters
  if (props.body.created_at_from !== undefined) {
    whereInput.created_at = {
      gte: new Date(props.body.created_at_from),
    };
  }
  if (props.body.created_at_to !== undefined) {
    const dateTo = new Date(props.body.created_at_to);
    if (
      whereInput.created_at &&
      typeof whereInput.created_at === "object" &&
      "gte" in whereInput.created_at
    ) {
      whereInput.created_at = {
        ...whereInput.created_at,
        lte: dateTo,
      };
    } else {
      whereInput.created_at = {
        lte: dateTo,
      };
    }
  }
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Execute findMany query
  const records = await MyGlobal.prisma.hrm_platform_project_members.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      role: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      employee: {
        select: {
          id: true,
          position: true,
          employment_type: true,
          status: true,
          created_at: true,
          user: {
            select: {
              id: true,
              email: true,
              display_name: true,
              avatar_image: true,
              phone_number: true,
            },
          },
          role: {
            select: {
              id: true,
              code: true,
              name: true,
              description: true,
              is_builtin: true,
              permissions: {
                select: {
                  permission: {
                    select: {
                      code: true,
                    },
                  },
                },
              },
              created_at: true,
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
              parent: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
            },
          },
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          color_code: true,
          status: true,
          budget_hours: true,
          start_date: true,
          end_date: true,
          organization: {
            select: {
              id: true,
              name: true,
              description: true,
              logo_url: true,
              currency: true,
              timezone: true,
              fiscal_start_month: true,
              created_at: true,
              updated_at: true,
            },
          },
          projectMemberships: {
            where: { deleted_at: null },
            select: { id: true },
          },
          created_at: true,
          updated_at: true,
        },
      },
    },
  } satisfies Prisma.hrm_platform_project_membersFindManyArgs);
  // Execute count query
  const total = await MyGlobal.prisma.hrm_platform_project_members.count({
    where: whereInput,
  });
  // Transform records to DTO format
  const data = await ArrayUtil.asyncMap(records, async (record) => {
    // Transform role permissions
    const permissions = record.employee.role.permissions.map(
      (rp) => rp.permission.code,
    );
    // Transform parent department
    let parentDepartment: IHrmPlatformDepartment.ISummary | null = null;
    if (record.employee.department?.parent) {
      parentDepartment = {
        id: record.employee.department.parent.id as string &
          tags.Format<"uuid">,
        name: record.employee.department.parent.name,
        description: record.employee.department.parent.description ?? undefined,
        parent_department: null,
        created_at: toISOStringSafe(
          record.employee.department.parent.created_at,
        ),
        updated_at: toISOStringSafe(
          record.employee.department.parent.updated_at,
        ),
        deleted_at: record.employee.department.parent.deleted_at
          ? toISOStringSafe(record.employee.department.parent.deleted_at)
          : null,
      } satisfies IHrmPlatformDepartment.ISummary;
    }
    // Transform department
    let department: IHrmPlatformDepartment.ISummary | null = null;
    if (record.employee.department) {
      department = {
        id: record.employee.department.id as string & tags.Format<"uuid">,
        name: record.employee.department.name,
        description: record.employee.department.description ?? undefined,
        parent_department: parentDepartment,
        created_at: toISOStringSafe(record.employee.department.created_at),
        updated_at: toISOStringSafe(record.employee.department.updated_at),
        deleted_at: record.employee.department.deleted_at
          ? toISOStringSafe(record.employee.department.deleted_at)
          : null,
      } satisfies IHrmPlatformDepartment.ISummary;
    }
    const employee: IHrmPlatformEmployee.ISummary = {
      id: record.employee.id as string & tags.Format<"uuid">,
      position: record.employee.position ?? null,
      employment_type: record.employee.employment_type,
      status: record.employee.status,
      user: {
        id: record.employee.user.id as string & tags.Format<"uuid">,
        email: record.employee.user.email as string & tags.Format<"email">,
        display_name: record.employee.user.display_name,
        avatar_image: record.employee.user.avatar_image ?? undefined,
        phone_number: record.employee.user.phone_number ?? undefined,
      } satisfies IHrmPlatformMember.ISummary,
      role: {
        id: record.employee.role.id as string & tags.Format<"uuid">,
        code: record.employee.role.code,
        name: record.employee.role.name,
        description: record.employee.role.description ?? undefined,
        is_builtin: record.employee.role.is_builtin,
        permissions,
        created_at: toISOStringSafe(record.employee.role.created_at),
        deleted_at: record.employee.role.deleted_at
          ? toISOStringSafe(record.employee.role.deleted_at)
          : null,
      } satisfies IHrmPlatformRole.ISummary,
      department,
      created_at: toISOStringSafe(record.employee.created_at),
    } satisfies IHrmPlatformEmployee.ISummary;
    const project: IHrmPlatformProject.ISummary = {
      id: record.project.id as string & tags.Format<"uuid">,
      name: record.project.name,
      color_code: record.project.color_code,
      status: record.project.status,
      budget_hours: record.project.budget_hours ?? undefined,
      start_date: record.project.start_date
        ? toISOStringSafe(record.project.start_date)
        : undefined,
      end_date: record.project.end_date
        ? toISOStringSafe(record.project.end_date)
        : undefined,
      organization: {
        id: record.project.organization.id as string & tags.Format<"uuid">,
        name: record.project.organization.name,
        description: record.project.organization.description ?? undefined,
        logo_url: record.project.organization.logo_url ?? undefined,
        currency: record.project.organization.currency,
        timezone: record.project.organization.timezone,
        fiscal_start_month: record.project.organization.fiscal_start_month,
        created_at: toISOStringSafe(record.project.organization.created_at),
        updated_at: toISOStringSafe(record.project.organization.updated_at),
      } satisfies IHrmPlatformOrganization.ISummary,
      member_count: record.project.projectMemberships.length,
      created_at: toISOStringSafe(record.project.created_at),
      updated_at: toISOStringSafe(record.project.updated_at),
    } satisfies IHrmPlatformProject.ISummary;
    return {
      id: record.id as string & tags.Format<"uuid">,
      role: record.role,
      employee,
      project,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    } satisfies IHrmPlatformProjectMember.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIHrmPlatformProjectMember.ISummary;
}
