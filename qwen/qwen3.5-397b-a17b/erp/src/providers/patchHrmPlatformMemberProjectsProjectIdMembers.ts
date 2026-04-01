import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow({
    where: {
      id: props.projectId,
      deleted_at: null,
    },
  });
  const whereInput = {
    hrm_platform_project_id: props.projectId,
    deleted_at: null,
    ...(props.body.role !== undefined && { role: props.body.role }),
    ...(props.body.employment_type !== undefined && {
      employee: {
        employment_type: props.body.employment_type,
      },
    }),
    ...(props.body.status !== undefined && {
      employee: {
        status: props.body.status,
      },
    }),
    ...(props.body.search !== undefined && {
      employee: {
        user: {
          display_name: {
            contains: props.body.search,
          },
        },
      },
    }),
  } satisfies Prisma.hrm_platform_project_membersWhereInput;
  const orderByInput = (
    props.body.sort === "employee_name"
      ? {
          employee: {
            user: {
              display_name: "asc",
            },
          },
        }
      : props.body.sort === "role"
        ? { role: "asc" }
        : { created_at: "desc" }
  ) satisfies Prisma.hrm_platform_project_membersOrderByWithRelationInput;
  const data = await MyGlobal.prisma.hrm_platform_project_members.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      role: true,
      created_at: true,
      employee: {
        select: {
          id: true,
          user: {
            select: {
              id: true,
              display_name: true,
              avatar_image: true,
              phone_number: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
              is_builtin: true,
              organization: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  logo: true,
                  currency: true,
                  timezone: true,
                },
              },
              created_at: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
              description: true,
              created_at: true,
              deleted_at: true,
            },
          },
          position: true,
          employment_type: true,
          status: true,
          created_at: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.hrm_platform_project_members.count({
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
      (member) =>
        ({
          id: member.id,
          role: member.role,
          employee: {
            id: member.employee.id,
            user: {
              id: member.employee.user.id,
              display_name: member.employee.user.display_name,
              avatar_image: member.employee.user.avatar_image ?? null,
              phone_number: member.employee.user.phone_number ?? null,
            } satisfies IHrmPlatformMember.ISummary,
            role: {
              id: member.employee.role.id,
              name: member.employee.role.name,
              is_builtin: member.employee.role.is_builtin,
              organization: {
                id: member.employee.role.organization.id,
                name: member.employee.role.organization.name,
                description:
                  member.employee.role.organization.description ?? null,
                logo: member.employee.role.organization.logo ?? null,
                currency: member.employee.role.organization.currency,
                timezone: member.employee.role.organization.timezone,
              } satisfies IHrmPlatformOrganization.ISummary,
              created_at: toISOStringSafe(member.employee.role.created_at),
            } satisfies IHrmPlatformRole.ISummary,
            department: member.employee.department
              ? ({
                  id: member.employee.department.id,
                  name: member.employee.department.name,
                  description: member.employee.department.description ?? null,
                  parent: null,
                  created_at: toISOStringSafe(
                    member.employee.department.created_at,
                  ),
                  deleted_at: member.employee.department.deleted_at
                    ? toISOStringSafe(member.employee.department.deleted_at)
                    : null,
                } satisfies IHrmPlatformDepartment.ISummary)
              : null,
            position: member.employee.position ?? null,
            employment_type: member.employee.employment_type,
            status: member.employee.status,
            created_at: toISOStringSafe(member.employee.created_at),
          } satisfies IHrmPlatformEmployee.ISummary,
          created_at: toISOStringSafe(member.created_at),
        }) satisfies IHrmPlatformProjectMember.ISummary,
    ),
  };
}
