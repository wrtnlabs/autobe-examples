import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
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
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
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
    ...(props.body.role && { role: props.body.role }),
    ...(props.body.search && {
      employee: {
        display_name: {
          contains: props.body.search,
          mode: "insensitive" as const,
        },
      },
    }),
  } satisfies Prisma.hrm_platform_project_membersWhereInput;
  const orderByInput = (() => {
    if (!props.body.sort) {
      return { created_at: "desc" as const };
    }
    if (props.body.sort === "name" || props.body.sort === "-name") {
      const direction = props.body.sort.startsWith("-") ? "desc" : "asc";
      return { employee: { display_name: direction as "asc" | "desc" } };
    }
    if (props.body.sort === "created_at" || props.body.sort === "-created_at") {
      const direction = props.body.sort.startsWith("-") ? "desc" : "asc";
      return { created_at: direction as "asc" | "desc" };
    }
    return { created_at: "desc" as const };
  })() satisfies Prisma.hrm_platform_project_membersOrderByWithRelationInput;
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
          display_name: true,
          position: true,
          employment_type: true,
          status: true,
          department: {
            select: {
              id: true,
              name: true,
              description: true,
              parent: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                },
              },
            },
          },
          role: {
            select: {
              id: true,
              name: true,
              built_in: true,
              created_at: true,
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
          started_at: true,
          ended_at: true,
          created_at: true,
          members: {
            select: {
              id: true,
            },
          },
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
      (membership) =>
        ({
          id: membership.id as string & tags.Format<"uuid">,
          role: membership.role,
          created_at: toISOStringSafe(membership.created_at),
          employee: {
            id: membership.employee.id as string & tags.Format<"uuid">,
            display_name: membership.employee.display_name,
            position: membership.employee.position,
            employment_type: membership.employee.employment_type,
            status: membership.employee.status,
            department: membership.employee.department
              ? {
                  id: membership.employee.department.id as string &
                    tags.Format<"uuid">,
                  name: membership.employee.department.name,
                  description: membership.employee.department.description,
                  parent: membership.employee.department.parent
                    ? {
                        id: membership.employee.department.parent.id as string &
                          tags.Format<"uuid">,
                        name: membership.employee.department.parent.name,
                        description:
                          membership.employee.department.parent.description,
                        parent: null,
                      }
                    : null,
                }
              : null,
            role: {
              id: membership.employee.role.id as string & tags.Format<"uuid">,
              name: membership.employee.role.name,
              built_in: membership.employee.role.built_in,
              created_at: toISOStringSafe(membership.employee.role.created_at),
            } satisfies IHrmPlatformRole.ISummary,
          } satisfies IHrmPlatformEmployee.ISummary,
          project: {
            id: membership.project.id as string & tags.Format<"uuid">,
            name: membership.project.name,
            color_code: membership.project.color_code,
            status: membership.project.status,
            budget_hours: membership.project.budget_hours ?? null,
            started_at: membership.project.started_at
              ? toISOStringSafe(membership.project.started_at)
              : null,
            ended_at: membership.project.ended_at
              ? toISOStringSafe(membership.project.ended_at)
              : null,
            created_at: toISOStringSafe(membership.project.created_at),
            members_count: membership.project.members.length,
          } satisfies IHrmPlatformProject.ISummary,
        }) satisfies IHrmPlatformProjectMember.ISummary,
    ),
  } satisfies IPageIHrmPlatformProjectMember.ISummary;
}
