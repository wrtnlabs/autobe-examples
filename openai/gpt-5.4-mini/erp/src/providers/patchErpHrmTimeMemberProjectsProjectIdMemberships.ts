import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProjectMembership";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeProjectMembership";
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

export async function patchErpHrmTimeMemberProjectsProjectIdMemberships(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmTimeProjectMembership.IRequest;
}): Promise<IPageIErpHrmTimeProjectMembership.ISummary> {
  const employee =
    await MyGlobal.prisma.erp_hrm_time_employees.findFirstOrThrow({
      where: {
        erp_hrm_time_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        erp_hrm_time_organization_id: true,
      },
    });
  await MyGlobal.prisma.erp_hrm_time_projects.findFirstOrThrow({
    where: {
      id: props.projectId,
      erp_hrm_time_organization_id: employee.erp_hrm_time_organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const search: string | undefined = props.body.search?.trim();
  const employeeSearch: string | undefined = props.body.employeeSearch?.trim();
  const where: Prisma.erp_hrm_time_project_membershipsWhereInput = {
    erp_hrm_time_project_id: props.projectId,
    deleted_at: null,
    ...(props.body.projectRole !== undefined
      ? { project_role: props.body.projectRole }
      : {}),
    ...(props.body.employeeId !== undefined
      ? { erp_hrm_time_employee_id: props.body.employeeId }
      : {}),
    ...(search !== undefined || employeeSearch !== undefined
      ? {
          OR: [
            ...(search !== undefined
              ? [
                  {
                    project_role: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    employee: {
                      is: {
                        position_title: {
                          contains: search,
                          mode: "insensitive" as const,
                        },
                      },
                    },
                  },
                  {
                    employee: {
                      is: {
                        employment_type: {
                          contains: search,
                          mode: "insensitive" as const,
                        },
                      },
                    },
                  },
                  {
                    employee: {
                      is: {
                        status: {
                          contains: search,
                          mode: "insensitive" as const,
                        },
                      },
                    },
                  },
                ]
              : []),
            ...(employeeSearch !== undefined
              ? [
                  {
                    employee: {
                      is: {
                        position_title: {
                          contains: employeeSearch,
                          mode: "insensitive" as const,
                        },
                      },
                    },
                  },
                  {
                    employee: {
                      is: {
                        employment_type: {
                          contains: employeeSearch,
                          mode: "insensitive" as const,
                        },
                      },
                    },
                  },
                  {
                    employee: {
                      is: {
                        status: {
                          contains: employeeSearch,
                          mode: "insensitive" as const,
                        },
                      },
                    },
                  },
                ]
              : []),
          ],
        }
      : {}),
  };
  const orderBy: Prisma.erp_hrm_time_project_membershipsOrderByWithRelationInput =
    {
      created_at: "desc",
    };
  const memberships =
    await MyGlobal.prisma.erp_hrm_time_project_memberships.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        project_role: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        project: {
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
            organization: {
              select: {
                id: true,
              },
            },
          },
        },
        employee: {
          select: {
            id: true,
            erp_hrm_time_organization_id: true,
            erp_hrm_time_member_id: true,
            erp_hrm_time_role_id: true,
            erp_hrm_time_department_id: true,
            position_title: true,
            employment_type: true,
            status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            organization: {
              select: {
                id: true,
              },
            },
            member: {
              select: {
                id: true,
              },
            },
            role: {
              select: {
                id: true,
                organization: {
                  select: {
                    id: true,
                  },
                },
                name: true,
                description: true,
                is_builtin: true,
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
                organization: {
                  select: {
                    id: true,
                  },
                },
                parentDepartment: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    organization: {
                      select: {
                        id: true,
                      },
                    },
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                },
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        },
      },
    });
  const total = await MyGlobal.prisma.erp_hrm_time_project_memberships.count({
    where,
  });
  const reconstructDepartment = (
    department: (typeof memberships)[number]["employee"]["department"] | null,
  ): IErpHrmTimeDepartment.ISummary | null => {
    if (department === null) return null;
    return {
      id: department.id,
      name: department.name,
      description: department.description,
      organization: {
        id: department.organization.id,
      },
      parentDepartment:
        department.parentDepartment === null
          ? null
          : {
              id: department.parentDepartment.id,
              name: department.parentDepartment.name,
              description: department.parentDepartment.description,
              organization: {
                id: department.parentDepartment.organization.id,
              },
              parentDepartment: null,
              createdAt: toISOStringSafe(
                department.parentDepartment.created_at,
              ),
              updatedAt: toISOStringSafe(
                department.parentDepartment.updated_at,
              ),
              deletedAt:
                department.parentDepartment.deleted_at === null
                  ? null
                  : toISOStringSafe(department.parentDepartment.deleted_at),
            },
      createdAt: toISOStringSafe(department.created_at),
      updatedAt: toISOStringSafe(department.updated_at),
      deletedAt:
        department.deleted_at === null
          ? null
          : toISOStringSafe(department.deleted_at),
    };
  };
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: memberships.map((membership) => ({
      id: membership.id,
      project: {
        id: membership.project.id,
        name: membership.project.name,
        description: membership.project.description,
        colorCode: membership.project.color_code,
        status: membership.project.status,
        budgetHours: membership.project.budget_hours,
        startDate:
          membership.project.start_date === null
            ? null
            : toISOStringSafe(membership.project.start_date),
        endDate:
          membership.project.end_date === null
            ? null
            : toISOStringSafe(membership.project.end_date),
        organization: {
          id: membership.project.organization.id,
        },
        createdAt: toISOStringSafe(membership.project.created_at),
        updatedAt: toISOStringSafe(membership.project.updated_at),
        deletedAt:
          membership.project.deleted_at === null
            ? null
            : toISOStringSafe(membership.project.deleted_at),
      },
      employee: {
        id: membership.employee.id,
        organization: {
          id: membership.employee.organization.id,
        },
        member: {
          id: membership.employee.member.id,
        },
        role: {
          id: membership.employee.role.id,
          organization: {
            id: membership.employee.role.organization.id,
          },
          name: membership.employee.role.name,
          description: membership.employee.role.description,
          isBuiltin: membership.employee.role.is_builtin,
          createdAt: toISOStringSafe(membership.employee.role.created_at),
          updatedAt: toISOStringSafe(membership.employee.role.updated_at),
          deletedAt:
            membership.employee.role.deleted_at === null
              ? null
              : toISOStringSafe(membership.employee.role.deleted_at),
        },
        department: reconstructDepartment(membership.employee.department),
        positionTitle: membership.employee.position_title,
        employmentType: membership.employee.employment_type,
        status: membership.employee.status,
        createdAt: toISOStringSafe(membership.employee.created_at),
        updatedAt: toISOStringSafe(membership.employee.updated_at),
        deletedAt:
          membership.employee.deleted_at === null
            ? null
            : toISOStringSafe(membership.employee.deleted_at),
      },
      projectRole: membership.project_role,
      createdAt: toISOStringSafe(membership.created_at),
      updatedAt: toISOStringSafe(membership.updated_at),
      deletedAt:
        membership.deleted_at === null
          ? null
          : toISOStringSafe(membership.deleted_at),
    })),
  };
}
