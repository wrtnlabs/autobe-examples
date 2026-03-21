import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

/**
 * Assign an employee to a project by creating a new project membership.
 */
export async function postErpHrmAdminProjectsProjectIdMembers(props: {
  admin: AdminPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmProjectMember.ICreate;
}): Promise<IErpHrmProjectMember> {
  // Step 1: Verify project exists and get organization ID
  const project = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: {
      id: true,
      erp_hrm_organization_id: true,
    },
  });
  // Step 2: Verify admin belongs to the same organization
  const admin = await MyGlobal.prisma.erp_hrm_admins.findFirst({
    where: {
      id: props.admin.id,
      erp_hrm_organization_id: project.erp_hrm_organization_id,
    },
    select: { id: true },
  });
  if (admin === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Validate employee_id exists in body
  const employeeId = props.body.employee_id;
  if (employeeId === undefined) {
    throw new HttpException("employee_id is required in body", 400);
  }
  // Step 4: Verify employee belongs to same organization
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      id: employeeId,
      erp_hrm_organization_id: project.erp_hrm_organization_id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (employee === null) {
    throw new HttpException(
      "Employee not found or does not belong to the project's organization",
      400,
    );
  }
  // Step 5: Check for existing membership (duplicate)
  const existingMembership =
    await MyGlobal.prisma.erp_hrm_project_members.findFirst({
      where: {
        erp_hrm_employee_id: employeeId,
        erp_hrm_project_id: props.projectId,
      },
      select: { id: true },
    });
  if (existingMembership !== null) {
    throw new HttpException(
      "Employee is already a member of this project",
      409,
    );
  }
  // Step 6: Validate assigned_role (default to 'member')
  const validRoles = ["member", "project_lead"] as const;
  const assignedRole =
    props.body.assigned_role !== undefined &&
    validRoles.includes(props.body.assigned_role as "member" | "project_lead")
      ? (props.body.assigned_role as "member" | "project_lead")
      : ("member" as const);
  // Step 7: Create project membership
  const membershipId = v4();
  const now = new Date();
  await MyGlobal.prisma.erp_hrm_project_members.create({
    data: {
      id: membershipId,
      erp_hrm_employee_id: employeeId,
      erp_hrm_project_id: props.projectId,
      assigned_role: assignedRole,
      created_at: now,
      updated_at: now,
    },
  });
  // Step 8: Fetch complete project with all relations for response
  const completeProject =
    await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
      where: { id: props.projectId },
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        status: true,
        budget_hours: true,
        start_date: true,
        end_date: true,
        created_at: true,
        updated_at: true,
        organization: {
          select: {
            id: true,
            name: true,
            description: true,
            logo_uri: true,
            currency: true,
            timezone: true,
            fiscal_start_month: true,
            created_at: true,
            owner_id: true,
            owner: {
              select: {
                id: true,
                email: true,
                display_name: true,
                avatar_uri: true,
                phone: true,
                created_at: true,
              },
            },
          },
        },
        projectMemberships: {
          select: {
            id: true,
            erp_hrm_employee_id: true,
            erp_hrm_project_id: true,
            assigned_role: true,
            created_at: true,
            updated_at: true,
            employee: {
              select: {
                id: true,
                position: true,
                employment_type: true,
                status: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                member: {
                  select: {
                    id: true,
                    email: true,
                    display_name: true,
                    avatar_uri: true,
                    phone: true,
                    created_at: true,
                  },
                },
                role: {
                  select: {
                    id: true,
                    name: true,
                    is_builtin: true,
                    created_at: true,
                    organization: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
                department: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    created_at: true,
                    updated_at: true,
                    parent_id: true,
                  },
                },
              },
            },
          },
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            description: true,
            due_date: true,
            estimated_hours: true,
            created_at: true,
            updated_at: true,
            erp_hrm_project_id: true,
            erp_hrm_employee_id: true,
            parent_task_id: true,
            assignee: {
              select: {
                id: true,
                position: true,
                employment_type: true,
                status: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                member: {
                  select: {
                    id: true,
                    email: true,
                    display_name: true,
                    avatar_uri: true,
                    phone: true,
                    created_at: true,
                  },
                },
                role: {
                  select: {
                    id: true,
                    name: true,
                    is_builtin: true,
                    created_at: true,
                    organization: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
                department: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    created_at: true,
                    updated_at: true,
                    parent_id: true,
                  },
                },
              },
            },
            project: {
              select: {
                id: true,
                name: true,
                color: true,
                status: true,
                budget_hours: true,
                start_date: true,
                end_date: true,
                created_at: true,
                updated_at: true,
                organization: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    logo_uri: true,
                    currency: true,
                    timezone: true,
                    fiscal_start_month: true,
                    created_at: true,
                    owner_id: true,
                  },
                },
              },
            },
          },
        },
        timelogs: {
          select: {
            id: true,
            date: true,
            duration_minutes: true,
            description: true,
            billable: true,
            created_at: true,
            updated_at: true,
            erp_hrm_employee_id: true,
            erp_hrm_project_id: true,
            erp_hrm_task_id: true,
            employee: {
              select: {
                id: true,
                position: true,
                employment_type: true,
                status: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                member: {
                  select: {
                    id: true,
                    email: true,
                    display_name: true,
                    avatar_uri: true,
                    phone: true,
                    created_at: true,
                  },
                },
                role: {
                  select: {
                    id: true,
                    name: true,
                    is_builtin: true,
                    created_at: true,
                    organization: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
                department: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    created_at: true,
                    updated_at: true,
                    parent_id: true,
                  },
                },
              },
            },
            project: {
              select: {
                id: true,
                name: true,
                color: true,
                status: true,
                budget_hours: true,
                start_date: true,
                end_date: true,
                created_at: true,
                updated_at: true,
                organization: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    logo_uri: true,
                    currency: true,
                    timezone: true,
                    fiscal_start_month: true,
                    created_at: true,
                    owner_id: true,
                  },
                },
              },
            },
            task: {
              select: {
                id: true,
                title: true,
                status: true,
                priority: true,
                description: true,
                due_date: true,
                estimated_hours: true,
                created_at: true,
                updated_at: true,
                erp_hrm_project_id: true,
                erp_hrm_employee_id: true,
                parent_task_id: true,
              },
            },
          },
        },
        timers: {
          select: {
            id: true,
            started_at: true,
            description: true,
            created_at: true,
            updated_at: true,
            erp_hrm_employee_id: true,
            erp_hrm_project_id: true,
            erp_hrm_task_id: true,
            employee: {
              select: {
                id: true,
                position: true,
                employment_type: true,
                status: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                member: {
                  select: {
                    id: true,
                    email: true,
                    display_name: true,
                    avatar_uri: true,
                    phone: true,
                    created_at: true,
                  },
                },
                role: {
                  select: {
                    id: true,
                    name: true,
                    is_builtin: true,
                    created_at: true,
                    organization: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
                department: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    created_at: true,
                    updated_at: true,
                    parent_id: true,
                  },
                },
              },
            },
            project: {
              select: {
                id: true,
                name: true,
                color: true,
                status: true,
                budget_hours: true,
                start_date: true,
                end_date: true,
                created_at: true,
                updated_at: true,
                organization: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    logo_uri: true,
                    currency: true,
                    timezone: true,
                    fiscal_start_month: true,
                    created_at: true,
                    owner_id: true,
                  },
                },
              },
            },
            task: {
              select: {
                id: true,
                title: true,
                status: true,
                priority: true,
                description: true,
                due_date: true,
                estimated_hours: true,
                created_at: true,
                updated_at: true,
                erp_hrm_project_id: true,
                erp_hrm_employee_id: true,
                parent_task_id: true,
              },
            },
          },
        },
        _count: {
          select: {
            projectMemberships: true,
            tasks: true,
            timelogs: true,
            timers: true,
          },
        },
      },
    });
  // Step 9: Transform to IErpHrmProjectMember
  return transformToIErpHrmProjectMember(completeProject);
}
/**
 * Transform database record to IErpHrmProjectMember response DTO
 */
function transformToIErpHrmProjectMember(
  project: Awaited<
    ReturnType<typeof MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow>
  > & {
    organization: {
      id: string;
      name: string;
      description: string | null;
      logo_uri: string | null;
      currency: string;
      timezone: string;
      fiscal_start_month: number;
      created_at: Date;
      owner_id: string;
      owner: {
        id: string;
        email: string;
        display_name: string;
        avatar_uri: string | null;
        phone: string | null;
        created_at: Date;
      };
    };
    projectMemberships: Array<{
      id: string;
      erp_hrm_employee_id: string;
      erp_hrm_project_id: string;
      assigned_role: string;
      created_at: Date;
      updated_at: Date;
      employee: {
        id: string;
        position: string | null;
        employment_type: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        deleted_at: Date | null;
        member: {
          id: string;
          email: string;
          display_name: string;
          avatar_uri: string | null;
          phone: string | null;
          created_at: Date;
        };
        role: {
          id: string;
          name: string;
          is_builtin: boolean;
          created_at: Date;
          organization: {
            id: string;
            name: string;
          };
        };
        department: {
          id: string;
          name: string;
          description: string | null;
          created_at: Date;
          updated_at: Date;
          parent_id: string | null;
        } | null;
      };
    }>;
    tasks: Array<{
      id: string;
      title: string;
      status: string;
      priority: string;
      description: string | null;
      due_date: Date | null;
      estimated_hours: number | null;
      created_at: Date;
      updated_at: Date;
      erp_hrm_project_id: string;
      erp_hrm_employee_id: string | null;
      parent_task_id: string | null;
      assignee: {
        id: string;
        position: string | null;
        employment_type: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        deleted_at: Date | null;
        member: {
          id: string;
          email: string;
          display_name: string;
          avatar_uri: string | null;
          phone: string | null;
          created_at: Date;
        };
        role: {
          id: string;
          name: string;
          is_builtin: boolean;
          created_at: Date;
          organization: {
            id: string;
            name: string;
          };
        };
        department: {
          id: string;
          name: string;
          description: string | null;
          created_at: Date;
          updated_at: Date;
          parent_id: string | null;
        } | null;
      } | null;
      project: {
        id: string;
        name: string;
        color: string;
        status: string;
        budget_hours: number | null;
        start_date: Date | null;
        end_date: Date | null;
        created_at: Date;
        updated_at: Date;
        organization: {
          id: string;
          name: string;
          description: string | null;
          logo_uri: string | null;
          currency: string;
          timezone: string;
          fiscal_start_month: number;
          created_at: Date;
          owner_id: string;
        };
      };
    }>;
    timelogs: Array<{
      id: string;
      date: Date;
      duration_minutes: number;
      description: string | null;
      billable: boolean;
      created_at: Date;
      updated_at: Date;
      erp_hrm_employee_id: string;
      erp_hrm_project_id: string;
      erp_hrm_task_id: string | null;
      employee: {
        id: string;
        position: string | null;
        employment_type: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        deleted_at: Date | null;
        member: {
          id: string;
          email: string;
          display_name: string;
          avatar_uri: string | null;
          phone: string | null;
          created_at: Date;
        };
        role: {
          id: string;
          name: string;
          is_builtin: boolean;
          created_at: Date;
          organization: {
            id: string;
            name: string;
          };
        };
        department: {
          id: string;
          name: string;
          description: string | null;
          created_at: Date;
          updated_at: Date;
          parent_id: string | null;
        } | null;
      };
      project: {
        id: string;
        name: string;
        color: string;
        status: string;
        budget_hours: number | null;
        start_date: Date | null;
        end_date: Date | null;
        created_at: Date;
        updated_at: Date;
        organization: {
          id: string;
          name: string;
          description: string | null;
          logo_uri: string | null;
          currency: string;
          timezone: string;
          fiscal_start_month: number;
          created_at: Date;
          owner_id: string;
        };
      };
      task: {
        id: string;
        title: string;
        status: string;
        priority: string;
        description: string | null;
        due_date: Date | null;
        estimated_hours: number | null;
        created_at: Date;
        updated_at: Date;
        erp_hrm_project_id: string;
        erp_hrm_employee_id: string | null;
        parent_task_id: string | null;
      } | null;
    }>;
    timers: Array<{
      id: string;
      started_at: Date;
      description: string | null;
      created_at: Date;
      updated_at: Date;
      erp_hrm_employee_id: string;
      erp_hrm_project_id: string;
      erp_hrm_task_id: string | null;
      employee: {
        id: string;
        position: string | null;
        employment_type: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        deleted_at: Date | null;
        member: {
          id: string;
          email: string;
          display_name: string;
          avatar_uri: string | null;
          phone: string | null;
          created_at: Date;
        };
        role: {
          id: string;
          name: string;
          is_builtin: boolean;
          created_at: Date;
          organization: {
            id: string;
            name: string;
          };
        };
        department: {
          id: string;
          name: string;
          description: string | null;
          created_at: Date;
          updated_at: Date;
          parent_id: string | null;
        } | null;
      };
      project: {
        id: string;
        name: string;
        color: string;
        status: string;
        budget_hours: number | null;
        start_date: Date | null;
        end_date: Date | null;
        created_at: Date;
        updated_at: Date;
        organization: {
          id: string;
          name: string;
          description: string | null;
          logo_uri: string | null;
          currency: string;
          timezone: string;
          fiscal_start_month: number;
          created_at: Date;
          owner_id: string;
        };
      };
      task: {
        id: string;
        title: string;
        status: string;
        priority: string;
        description: string | null;
        due_date: Date | null;
        estimated_hours: number | null;
        created_at: Date;
        updated_at: Date;
        erp_hrm_project_id: string;
        erp_hrm_employee_id: string | null;
        parent_task_id: string | null;
      } | null;
    }>;
    _count: {
      projectMemberships: number;
      tasks: number;
      timelogs: number;
      timers: number;
    };
  },
): IErpHrmProjectMember {
  const now = Date.now();
  return {
    id: project.id as string & tags.Format<"uuid">,
    name: project.name,
    description: project.description ?? undefined,
    color: project.color,
    status: project.status,
    budget_hours: project.budget_hours ?? undefined,
    start_date:
      project.start_date !== null
        ? (project.start_date.toISOString() as string &
            tags.Format<"date-time">)
        : undefined,
    end_date:
      project.end_date !== null
        ? (project.end_date.toISOString() as string & tags.Format<"date-time">)
        : undefined,
    created_at: toISOStringSafe(project.created_at),
    updated_at: toISOStringSafe(project.updated_at),
    organization: {
      id: project.organization.id as string & tags.Format<"uuid">,
      name: project.organization.name,
      description: project.organization.description ?? undefined,
      logoUri: project.organization.logo_uri ?? null,
      currency: project.organization.currency,
      timezone: project.organization.timezone,
      fiscalStartMonth: project.organization.fiscal_start_month as number &
        tags.Type<"int32">,
      createdAt: toISOStringSafe(project.organization.created_at),
      owner: {
        id: project.organization.owner.id as string & tags.Format<"uuid">,
        email: project.organization.owner.email as string &
          tags.Format<"email">,
        displayName: project.organization.owner.display_name,
        avatarUri: project.organization.owner.avatar_uri ?? null,
        phone: project.organization.owner.phone ?? null,
        createdAt: toISOStringSafe(project.organization.owner.created_at),
      },
    },
    project_members_count: project._count.projectMemberships as number &
      tags.Type<"int32">,
    projectMemberships: project.projectMemberships.map((pm) => ({
      id: pm.project.id as string & tags.Format<"uuid">,
      name: pm.project.name,
      color: pm.project.color,
      status: pm.project.status,
      budget_hours: pm.project.budget_hours ?? undefined,
      start_date:
        pm.project.start_date !== null
          ? (pm.project.start_date.toISOString() as string &
              tags.Format<"date-time">)
          : undefined,
      end_date:
        pm.project.end_date !== null
          ? (pm.project.end_date.toISOString() as string &
              tags.Format<"date-time">)
          : undefined,
      created_at: toISOStringSafe(pm.project.created_at),
      organization: {
        id: pm.project.organization.id as string & tags.Format<"uuid">,
        name: pm.project.organization.name,
        description: pm.project.organization.description ?? undefined,
        logoUri: pm.project.organization.logo_uri ?? null,
        currency: pm.project.organization.currency,
        timezone: pm.project.organization.timezone,
        fiscalStartMonth: pm.project.organization.fiscal_start_month as number &
          tags.Type<"int32">,
        createdAt: toISOStringSafe(pm.project.organization.created_at),
        owner: {
          id: pm.project.organization.owner_id as string & tags.Format<"uuid">,
          email: "" as string & tags.Format<"email">,
          displayName: "" as string,
          createdAt: "" as string & tags.Format<"date-time">,
        },
      },
    })),
    tasks_count: project._count.tasks as number & tags.Type<"int32">,
    tasks: project.tasks.map((t) => ({
      id: t.id as string & tags.Format<"uuid">,
      title: t.title,
      status: t.status,
      priority: t.priority,
      project: {
        id: t.project.id as string & tags.Format<"uuid">,
        name: t.project.name,
        color: t.project.color,
        status: t.project.status,
        budget_hours: t.project.budget_hours ?? undefined,
        start_date:
          t.project.start_date !== null
            ? (t.project.start_date.toISOString() as string &
                tags.Format<"date-time">)
            : undefined,
        end_date:
          t.project.end_date !== null
            ? (t.project.end_date.toISOString() as string &
                tags.Format<"date-time">)
            : undefined,
        created_at: toISOStringSafe(t.project.created_at),
        organization: {
          id: t.project.organization.id as string & tags.Format<"uuid">,
          name: t.project.organization.name,
          description: t.project.organization.description ?? undefined,
          logoUri: t.project.organization.logo_uri ?? null,
          currency: t.project.organization.currency,
          timezone: t.project.organization.timezone,
          fiscalStartMonth: t.project.organization
            .fiscal_start_month as number & tags.Type<"int32">,
          createdAt: toISOStringSafe(t.project.organization.created_at),
          owner: {
            id: t.project.organization.owner_id as string & tags.Format<"uuid">,
            email: "" as string & tags.Format<"email">,
            displayName: "" as string,
            createdAt: "" as string & tags.Format<"date-time">,
          },
        },
      },
      assignee:
        t.assignee !== null
          ? {
              id: t.assignee.id as string & tags.Format<"uuid">,
              position: t.assignee.position ?? undefined,
              employment_type: t.assignee.employment_type,
              status: t.assignee.status,
              created_at: toISOStringSafe(t.assignee.created_at),
              updated_at: toISOStringSafe(t.assignee.updated_at),
              deleted_at:
                t.assignee.deleted_at !== null
                  ? toISOStringSafe(t.assignee.deleted_at)
                  : undefined,
              member: {
                id: t.assignee.member.id as string & tags.Format<"uuid">,
                email: t.assignee.member.email as string & tags.Format<"email">,
                displayName: t.assignee.member.display_name,
                avatarUri: t.assignee.member.avatar_uri ?? null,
                phone: t.assignee.member.phone ?? null,
                createdAt: toISOStringSafe(t.assignee.member.created_at),
              },
              role: {
                id: t.assignee.role.id as string & tags.Format<"uuid">,
                name: t.assignee.role.name,
                is_builtin: t.assignee.role.is_builtin,
                created_at: toISOStringSafe(t.assignee.role.created_at),
                organization: {
                  id: t.assignee.role.organization.id as string &
                    tags.Format<"uuid">,
                  name: t.assignee.role.organization.name,
                  description: undefined,
                  logoUri: null,
                  currency: "",
                  timezone: "",
                  fiscalStartMonth: 1 as number & tags.Type<"int32">,
                  createdAt: "" as string & tags.Format<"date-time">,
                  owner: {
                    id: "" as string & tags.Format<"uuid">,
                    email: "" as string & tags.Format<"email">,
                    displayName: "" as string,
                    createdAt: "" as string & tags.Format<"date-time">,
                  },
                },
              },
              department:
                t.assignee.department !== null
                  ? {
                      id: t.assignee.department.id as string &
                        tags.Format<"uuid">,
                      name: t.assignee.department.name,
                      description:
                        t.assignee.department.description ?? undefined,
                      created_at: toISOStringSafe(
                        t.assignee.department.created_at,
                      ),
                      updated_at: toISOStringSafe(
                        t.assignee.department.updated_at,
                      ),
                      parent: undefined,
                    }
                  : undefined,
            }
          : undefined,
      due_date: t.due_date !== null ? toISOStringSafe(t.due_date) : undefined,
      subtasks_count: 0 as number & tags.Type<"int32">,
      task_histories_count: 0 as number & tags.Type<"int32">,
      timelogs_count: 0 as number & tags.Type<"int32">,
      timers_count: 0 as number & tags.Type<"int32">,
    })),
    timelogs: project.timelogs.map((tl) => ({
      id: tl.id as string & tags.Format<"uuid">,
      date: toISOStringSafe(tl.date),
      duration_minutes: tl.duration_minutes as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      description: tl.description ?? undefined,
      billable: tl.billable,
      project: {
        id: tl.project.id as string & tags.Format<"uuid">,
        name: tl.project.name,
        color: tl.project.color,
        status: tl.project.status,
        budget_hours: tl.project.budget_hours ?? undefined,
        start_date:
          tl.project.start_date !== null
            ? (tl.project.start_date.toISOString() as string &
                tags.Format<"date-time">)
            : undefined,
        end_date:
          tl.project.end_date !== null
            ? (tl.project.end_date.toISOString() as string &
                tags.Format<"date-time">)
            : undefined,
        created_at: toISOStringSafe(tl.project.created_at),
        organization: {
          id: tl.project.organization.id as string & tags.Format<"uuid">,
          name: tl.project.organization.name,
          description: tl.project.organization.description ?? undefined,
          logoUri: tl.project.organization.logo_uri ?? null,
          currency: tl.project.organization.currency,
          timezone: tl.project.organization.timezone,
          fiscalStartMonth: tl.project.organization
            .fiscal_start_month as number & tags.Type<"int32">,
          createdAt: toISOStringSafe(tl.project.organization.created_at),
          owner: {
            id: tl.project.organization.owner_id as string &
              tags.Format<"uuid">,
            email: "" as string & tags.Format<"email">,
            displayName: "" as string,
            createdAt: "" as string & tags.Format<"date-time">,
          },
        },
      },
      task:
        tl.task !== null
          ? {
              id: tl.task.id as string & tags.Format<"uuid">,
              title: tl.task.title,
              status: tl.task.status,
              priority: tl.task.priority,
              project: {
                id: tl.task.project.id as string & tags.Format<"uuid">,
                name: tl.task.project.name,
                color: tl.task.project.color,
                status: tl.task.project.status,
                budget_hours: tl.task.project.budget_hours ?? undefined,
                start_date:
                  tl.task.project.start_date !== null
                    ? (tl.task.project.start_date.toISOString() as string &
                        tags.Format<"date-time">)
                    : undefined,
                end_date:
                  tl.task.project.end_date !== null
                    ? (tl.task.project.end_date.toISOString() as string &
                        tags.Format<"date-time">)
                    : undefined,
                created_at: toISOStringSafe(tl.task.project.created_at),
                organization: {
                  id: tl.task.project.organization.id as string &
                    tags.Format<"uuid">,
                  name: tl.task.project.organization.name,
                  description:
                    tl.task.project.organization.description ?? undefined,
                  logoUri: tl.task.project.organization.logo_uri ?? null,
                  currency: tl.task.project.organization.currency,
                  timezone: tl.task.project.organization.timezone,
                  fiscalStartMonth: tl.task.project.organization
                    .fiscal_start_month as number & tags.Type<"int32">,
                  createdAt: toISOStringSafe(
                    tl.task.project.organization.created_at,
                  ),
                  owner: {
                    id: tl.task.project.organization.owner_id as string &
                      tags.Format<"uuid">,
                    email: "" as string & tags.Format<"email">,
                    displayName: "" as string,
                    createdAt: "" as string & tags.Format<"date-time">,
                  },
                },
              },
              assignee: undefined,
              due_date:
                tl.task.due_date !== null
                  ? toISOStringSafe(tl.task.due_date)
                  : undefined,
              subtasks_count: 0 as number & tags.Type<"int32">,
              task_histories_count: 0 as number & tags.Type<"int32">,
              timelogs_count: 0 as number & tags.Type<"int32">,
              timers_count: 0 as number & tags.Type<"int32">,
            }
          : undefined,
      employee: {
        id: tl.employee.id as string & tags.Format<"uuid">,
        position: tl.employee.position ?? undefined,
        employment_type: tl.employee.employment_type,
        status: tl.employee.status,
        created_at: toISOStringSafe(tl.employee.created_at),
        updated_at: toISOStringSafe(tl.employee.updated_at),
        deleted_at:
          tl.employee.deleted_at !== null
            ? toISOStringSafe(tl.employee.deleted_at)
            : undefined,
        member: {
          id: tl.employee.member.id as string & tags.Format<"uuid">,
          email: tl.employee.member.email as string & tags.Format<"email">,
          displayName: tl.employee.member.display_name,
          avatarUri: tl.employee.member.avatar_uri ?? null,
          phone: tl.employee.member.phone ?? null,
          createdAt: toISOStringSafe(tl.employee.member.created_at),
        },
        role: {
          id: tl.employee.role.id as string & tags.Format<"uuid">,
          name: tl.employee.role.name,
          is_builtin: tl.employee.role.is_builtin,
          created_at: toISOStringSafe(tl.employee.role.created_at),
          organization: {
            id: tl.employee.role.organization.id as string &
              tags.Format<"uuid">,
            name: tl.employee.role.organization.name,
            description: undefined,
            logoUri: null,
            currency: "",
            timezone: "",
            fiscalStartMonth: 1 as number & tags.Type<"int32">,
            createdAt: "" as string & tags.Format<"date-time">,
            owner: {
              id: "" as string & tags.Format<"uuid">,
              email: "" as string & tags.Format<"email">,
              displayName: "" as string,
              createdAt: "" as string & tags.Format<"date-time">,
            },
          },
        },
        department:
          tl.employee.department !== null
            ? {
                id: tl.employee.department.id as string & tags.Format<"uuid">,
                name: tl.employee.department.name,
                description: tl.employee.department.description ?? undefined,
                created_at: toISOStringSafe(tl.employee.department.created_at),
                updated_at: toISOStringSafe(tl.employee.department.updated_at),
                parent: undefined,
              }
            : undefined,
      },
    })),
    timers: project.timers.map((tr) => {
      const startedMs = tr.started_at.getTime();
      const elapsedMs = now - startedMs;
      return {
        id: tr.id as string & tags.Format<"uuid">,
        startedAt: toISOStringSafe(tr.started_at),
        description: tr.description ?? undefined,
        project: {
          id: tr.project.id as string & tags.Format<"uuid">,
          name: tr.project.name,
          color: tr.project.color,
          status: tr.project.status,
          budget_hours: tr.project.budget_hours ?? undefined,
          start_date:
            tr.project.start_date !== null
              ? (tr.project.start_date.toISOString() as string &
                  tags.Format<"date-time">)
              : undefined,
          end_date:
            tr.project.end_date !== null
              ? (tr.project.end_date.toISOString() as string &
                  tags.Format<"date-time">)
              : undefined,
          created_at: toISOStringSafe(tr.project.created_at),
          organization: {
            id: tr.project.organization.id as string & tags.Format<"uuid">,
            name: tr.project.organization.name,
            description: tr.project.organization.description ?? undefined,
            logoUri: tr.project.organization.logo_uri ?? null,
            currency: tr.project.organization.currency,
            timezone: tr.project.organization.timezone,
            fiscalStartMonth: tr.project.organization
              .fiscal_start_month as number & tags.Type<"int32">,
            createdAt: toISOStringSafe(tr.project.organization.created_at),
            owner: {
              id: tr.project.organization.owner_id as string &
                tags.Format<"uuid">,
              email: "" as string & tags.Format<"email">,
              displayName: "" as string,
              createdAt: "" as string & tags.Format<"date-time">,
            },
          },
        },
        task:
          tr.task !== null
            ? {
                id: tr.task.id as string & tags.Format<"uuid">,
                title: tr.task.title,
                status: tr.task.status,
                priority: tr.task.priority,
                project: {
                  id: tr.task.project.id as string & tags.Format<"uuid">,
                  name: tr.task.project.name,
                  color: tr.task.project.color,
                  status: tr.task.project.status,
                  budget_hours: tr.task.project.budget_hours ?? undefined,
                  start_date:
                    tr.task.project.start_date !== null
                      ? (tr.task.project.start_date.toISOString() as string &
                          tags.Format<"date-time">)
                      : undefined,
                  end_date:
                    tr.task.project.end_date !== null
                      ? (tr.task.project.end_date.toISOString() as string &
                          tags.Format<"date-time">)
                      : undefined,
                  created_at: toISOStringSafe(tr.task.project.created_at),
                  organization: {
                    id: tr.task.project.organization.id as string &
                      tags.Format<"uuid">,
                    name: tr.task.project.organization.name,
                    description:
                      tr.task.project.organization.description ?? undefined,
                    logoUri: tr.task.project.organization.logo_uri ?? null,
                    currency: tr.task.project.organization.currency,
                    timezone: tr.task.project.organization.timezone,
                    fiscalStartMonth: tr.task.project.organization
                      .fiscal_start_month as number & tags.Type<"int32">,
                    createdAt: toISOStringSafe(
                      tr.task.project.organization.created_at,
                    ),
                    owner: {
                      id: tr.task.project.organization.owner_id as string &
                        tags.Format<"uuid">,
                      email: "" as string & tags.Format<"email">,
                      displayName: "" as string,
                      createdAt: "" as string & tags.Format<"date-time">,
                    },
                  },
                },
                assignee: undefined,
                due_date:
                  tr.task.due_date !== null
                    ? toISOStringSafe(tr.task.due_date)
                    : undefined,
                subtasks_count: 0 as number & tags.Type<"int32">,
                task_histories_count: 0 as number & tags.Type<"int32">,
                timelogs_count: 0 as number & tags.Type<"int32">,
                timers_count: 0 as number & tags.Type<"int32">,
              }
            : undefined,
        elapsed_time_ms: elapsedMs as number & tags.Type<"int32">,
      };
    }),
  };
}
