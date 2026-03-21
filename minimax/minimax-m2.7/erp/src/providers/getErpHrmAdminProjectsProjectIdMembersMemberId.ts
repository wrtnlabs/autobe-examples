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

export async function getErpHrmAdminProjectsProjectIdMembersMemberId(props: {
  admin: AdminPayload;
  projectId: string & tags.Format<"uuid">;
  memberId: string & tags.Format<"uuid">;
}): Promise<IErpHrmProjectMember> {
  // Query the project membership record by memberId with all related data
  const projectMember =
    await MyGlobal.prisma.erp_hrm_project_members.findUnique({
      where: { id: props.memberId },
      select: {
        id: true,
        assigned_role: true,
        erp_hrm_project_id: true,
        erp_hrm_employee_id: true,
        created_at: true,
        updated_at: true,
        project: {
          select: {
            id: true,
            erp_hrm_organization_id: true,
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
            projectMemberships: {
              select: {
                id: true,
                assigned_role: true,
                created_at: true,
                updated_at: true,
                employee: {
                  select: {
                    id: true,
                    erp_hrm_member_id: true,
                    erp_hrm_role_id: true,
                    erp_hrm_department_id: true,
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
                    department: {
                      select: {
                        id: true,
                        name: true,
                        description: true,
                        erp_hrm_parent_department_id: true,
                        created_at: true,
                        updated_at: true,
                        parent: {
                          select: {
                            id: true,
                            name: true,
                            description: true,
                            erp_hrm_parent_department_id: true,
                            created_at: true,
                            updated_at: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            } satisfies Prisma.erp_hrm_project_membersFindManyArgs,
            tasks: {
              select: {
                id: true,
                title: true,
                description: true,
                status: true,
                priority: true,
                due_date: true,
                estimated_hours: true,
                erp_hrm_project_id: true,
                erp_hrm_employee_id: true,
                erp_hrm_parent_task_id: true,
                created_at: true,
                updated_at: true,
                assignee: {
                  select: {
                    id: true,
                    erp_hrm_member_id: true,
                    erp_hrm_role_id: true,
                    erp_hrm_department_id: true,
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
                    department: {
                      select: {
                        id: true,
                        name: true,
                        description: true,
                        erp_hrm_parent_department_id: true,
                        created_at: true,
                        updated_at: true,
                        parent: {
                          select: {
                            id: true,
                            name: true,
                            description: true,
                            erp_hrm_parent_department_id: true,
                            created_at: true,
                            updated_at: true,
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
                    color: true,
                    status: true,
                    budget_hours: true,
                    start_date: true,
                    end_date: true,
                    created_at: true,
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
                subtasks: {
                  select: {
                    id: true,
                    title: true,
                    description: true,
                    status: true,
                    priority: true,
                    due_date: true,
                    estimated_hours: true,
                    erp_hrm_project_id: true,
                    erp_hrm_employee_id: true,
                    erp_hrm_parent_task_id: true,
                    created_at: true,
                    updated_at: true,
                    assignee: {
                      select: {
                        id: true,
                        erp_hrm_member_id: true,
                        erp_hrm_role_id: true,
                        erp_hrm_department_id: true,
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
                        department: {
                          select: {
                            id: true,
                            name: true,
                            description: true,
                            erp_hrm_parent_department_id: true,
                            created_at: true,
                            updated_at: true,
                            parent: {
                              select: {
                                id: true,
                                name: true,
                                description: true,
                                erp_hrm_parent_department_id: true,
                                created_at: true,
                                updated_at: true,
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
                        color: true,
                        status: true,
                        budget_hours: true,
                        start_date: true,
                        end_date: true,
                        created_at: true,
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
                    subtasks: {
                      select: {
                        id: true,
                      },
                    },
                    taskHistories: {
                      select: {
                        id: true,
                        previous_status: true,
                        new_status: true,
                        erp_hrm_member_id: true,
                        erp_hrm_task_id: true,
                        created_at: true,
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
                      },
                    },
                    timelogs: {
                      select: {
                        id: true,
                        date: true,
                        duration_minutes: true,
                        description: true,
                        billable: true,
                        erp_hrm_employee_id: true,
                        erp_hrm_project_id: true,
                        erp_hrm_task_id: true,
                        created_at: true,
                        updated_at: true,
                      },
                    },
                    timers: {
                      select: {
                        id: true,
                        started_at: true,
                        description: true,
                        erp_hrm_employee_id: true,
                        erp_hrm_project_id: true,
                        erp_hrm_task_id: true,
                        created_at: true,
                        updated_at: true,
                      },
                    },
                    _count: {
                      select: {
                        subtasks: true,
                        taskHistories: true,
                        timelogs: true,
                        timers: true,
                      },
                    },
                  },
                },
                taskHistories: {
                  select: {
                    id: true,
                    previous_status: true,
                    new_status: true,
                    erp_hrm_member_id: true,
                    erp_hrm_task_id: true,
                    created_at: true,
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
                  },
                },
                timelogs: {
                  select: {
                    id: true,
                    date: true,
                    duration_minutes: true,
                    description: true,
                    billable: true,
                    erp_hrm_employee_id: true,
                    erp_hrm_project_id: true,
                    erp_hrm_task_id: true,
                    created_at: true,
                    updated_at: true,
                  },
                },
                timers: {
                  select: {
                    id: true,
                    started_at: true,
                    description: true,
                    erp_hrm_employee_id: true,
                    erp_hrm_project_id: true,
                    erp_hrm_task_id: true,
                    created_at: true,
                    updated_at: true,
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
                erp_hrm_employee_id: true,
                erp_hrm_project_id: true,
                erp_hrm_task_id: true,
                created_at: true,
                updated_at: true,
              },
            },
            timers: {
              select: {
                id: true,
                started_at: true,
                description: true,
                erp_hrm_employee_id: true,
                erp_hrm_project_id: true,
                erp_hrm_task_id: true,
                created_at: true,
                updated_at: true,
              },
            },
          },
        },
        employee: {
          select: {
            id: true,
            erp_hrm_member_id: true,
            erp_hrm_role_id: true,
            erp_hrm_department_id: true,
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
            department: {
              select: {
                id: true,
                name: true,
                description: true,
                erp_hrm_parent_department_id: true,
                created_at: true,
                updated_at: true,
                parent: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    erp_hrm_parent_department_id: true,
                    created_at: true,
                    updated_at: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  // Validate project membership exists
  if (projectMember === null) {
    throw new HttpException("Project member not found", 404);
  }
  // Validate projectId matches the membership's project
  if (projectMember.erp_hrm_project_id !== props.projectId) {
    throw new HttpException("Project member not found in this project", 404);
  }
  // Authorization check
  const adminEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.admin.id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_role_id: true,
      erp_hrm_organization_id: true,
      role: {
        select: {
          is_builtin: true,
          name: true,
        },
      },
    },
  });
  if (adminEmployee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if admin has project:manage permission (Owner or Manager role)
  const hasProjectManagePermission =
    adminEmployee.role.name === "Owner" ||
    adminEmployee.role.name === "Manager";
  // If not project:manage, check if admin is a member or project lead of this project
  if (!hasProjectManagePermission) {
    const adminMembership =
      await MyGlobal.prisma.erp_hrm_project_members.findFirst({
        where: {
          erp_hrm_employee_id: adminEmployee.id,
          erp_hrm_project_id: props.projectId,
        },
        select: {
          id: true,
          assigned_role: true,
        },
      });
    if (adminMembership === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Helper function to build member summary
  const buildMemberSummary = (member: {
    id: string;
    email: string;
    display_name: string;
    avatar_uri: string | null;
    phone: string | null;
    created_at: Date;
  }): IErpHrmMember.ISummary => ({
    id: member.id,
    email: member.email as string & tags.Format<"email">,
    displayName: member.display_name,
    avatarUri: member.avatar_uri ?? undefined,
    phone: member.phone ?? undefined,
    createdAt: member.created_at.toISOString(),
  });
  // Helper function to build organization summary
  const buildOrganizationSummary = (org: {
    id: string;
    name: string;
    description: string | null;
    logo_uri: string | null;
    currency: string;
    timezone: string;
    fiscal_start_month: number;
    created_at: Date;
    owner_id: string;
  }): IErpHrmOrganization.ISummary => {
    const owner = buildMemberSummary({
      id: projectMember.employee.member.id,
      email: projectMember.employee.member.email,
      display_name: projectMember.employee.member.display_name,
      avatar_uri: projectMember.employee.member.avatar_uri,
      phone: projectMember.employee.member.phone,
      created_at: projectMember.employee.member.created_at,
    });
    return {
      id: org.id,
      name: org.name,
      description: org.description ?? undefined,
      logoUri: org.logo_uri ?? undefined,
      currency: org.currency,
      timezone: org.timezone,
      fiscalStartMonth: org.fiscal_start_month,
      createdAt: org.created_at.toISOString(),
      owner,
    };
  };
  // Helper function to build department summary
  const buildDepartmentSummary = (dept: {
    id: string;
    name: string;
    description: string | null;
    created_at: Date;
    updated_at: Date;
    parent: {
      id: string;
      name: string;
      description: string | null;
      created_at: Date;
      updated_at: Date;
    } | null;
  }): IErpHrmDepartment.ISummary => ({
    id: dept.id,
    name: dept.name,
    description: dept.description ?? undefined,
    created_at: dept.created_at.toISOString(),
    updated_at: dept.updated_at.toISOString(),
    parent: dept.parent
      ? {
          id: dept.parent.id,
          name: dept.parent.name,
          description: dept.parent.description ?? undefined,
          created_at: dept.parent.created_at.toISOString(),
          updated_at: dept.parent.updated_at.toISOString(),
        }
      : undefined,
  });
  // Helper function to build role summary
  const buildRoleSummary = (role: {
    id: string;
    name: string;
    is_builtin: boolean;
    created_at: Date;
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
  }): IErpHrmRole.ISummary => ({
    id: role.id,
    name: role.name,
    is_builtin: role.is_builtin,
    created_at: role.created_at.toISOString(),
    organization: buildOrganizationSummary(role.organization),
  });
  // Helper function to build employee summary
  const buildEmployeeSummary = (emp: {
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
        description: string | null;
        logo_uri: string | null;
        currency: string;
        timezone: string;
        fiscal_start_month: number;
        created_at: Date;
        owner_id: string;
      };
    };
    department: {
      id: string;
      name: string;
      description: string | null;
      created_at: Date;
      updated_at: Date;
      parent: {
        id: string;
        name: string;
        description: string | null;
        created_at: Date;
        updated_at: Date;
      } | null;
    } | null;
  }): IErpHrmEmployee.ISummary => ({
    id: emp.id,
    position: emp.position ?? undefined,
    employment_type: emp.employment_type,
    status: emp.status,
    created_at: emp.created_at.toISOString(),
    updated_at: emp.updated_at.toISOString(),
    deleted_at: emp.deleted_at?.toISOString() ?? undefined,
    member: buildMemberSummary(emp.member),
    role: buildRoleSummary(emp.role),
    department: emp.department
      ? buildDepartmentSummary(emp.department)
      : undefined,
  });
  // Helper function to build project summary
  const buildProjectSummary = (proj: {
    id: string;
    name: string;
    color: string;
    status: string;
    budget_hours: number | null;
    start_date: Date | null;
    end_date: Date | null;
    created_at: Date;
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
  }): IErpHrmProjectMember.ISummary => ({
    id: proj.id,
    name: proj.name,
    color: proj.color,
    status: proj.status,
    budget_hours: proj.budget_hours ?? undefined,
    start_date: proj.start_date?.toISOString() ?? null,
    end_date: proj.end_date?.toISOString() ?? null,
    created_at: proj.created_at.toISOString(),
    organization: buildOrganizationSummary(proj.organization),
  });
  // Helper function to build task summary
  const buildTaskSummary = (task: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    due_date: Date | null;
    estimated_hours: number | null;
    erp_hrm_project_id: string;
    erp_hrm_employee_id: string | null;
    erp_hrm_parent_task_id: string | null;
    created_at: Date;
    updated_at: Date;
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
          description: string | null;
          logo_uri: string | null;
          currency: string;
          timezone: string;
          fiscal_start_month: number;
          created_at: Date;
          owner_id: string;
        };
      };
      department: {
        id: string;
        name: string;
        description: string | null;
        created_at: Date;
        updated_at: Date;
        parent: {
          id: string;
          name: string;
          description: string | null;
          created_at: Date;
          updated_at: Date;
        } | null;
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
    subtasks: {
      id: string;
      title: string;
      description: string | null;
      status: string;
      priority: string;
      due_date: Date | null;
      estimated_hours: number | null;
      erp_hrm_project_id: string;
      erp_hrm_employee_id: string | null;
      erp_hrm_parent_task_id: string | null;
      created_at: Date;
      updated_at: Date;
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
            description: string | null;
            logo_uri: string | null;
            currency: string;
            timezone: string;
            fiscal_start_month: number;
            created_at: Date;
            owner_id: string;
          };
        };
        department: {
          id: string;
          name: string;
          description: string | null;
          created_at: Date;
          updated_at: Date;
          parent: {
            id: string;
            name: string;
            description: string | null;
            created_at: Date;
            updated_at: Date;
          } | null;
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
      subtasks: {
        id: string;
      }[];
      taskHistories: {
        id: string;
        previous_status: string;
        new_status: string;
        erp_hrm_member_id: string;
        erp_hrm_task_id: string;
        created_at: Date;
        member: {
          id: string;
          email: string;
          display_name: string;
          avatar_uri: string | null;
          phone: string | null;
          created_at: Date;
        };
      }[];
      timelogs: {
        id: string;
        date: Date;
        duration_minutes: number;
        description: string | null;
        billable: boolean;
        erp_hrm_employee_id: string;
        erp_hrm_project_id: string;
        erp_hrm_task_id: string | null;
        created_at: Date;
        updated_at: Date;
      }[];
      timers: {
        id: string;
        started_at: Date;
        description: string | null;
        erp_hrm_employee_id: string;
        erp_hrm_project_id: string;
        erp_hrm_task_id: string | null;
        created_at: Date;
        updated_at: Date;
      }[];
      _count: {
        subtasks: number;
        taskHistories: number;
        timelogs: number;
        timers: number;
      };
    }[];
    taskHistories: {
      id: string;
      previous_status: string;
      new_status: string;
      erp_hrm_member_id: string;
      erp_hrm_task_id: string;
      created_at: Date;
      member: {
        id: string;
        email: string;
        display_name: string;
        avatar_uri: string | null;
        phone: string | null;
        created_at: Date;
      };
    }[];
    timelogs: {
      id: string;
      date: Date;
      duration_minutes: number;
      description: string | null;
      billable: boolean;
      erp_hrm_employee_id: string;
      erp_hrm_project_id: string;
      erp_hrm_task_id: string | null;
      created_at: Date;
      updated_at: Date;
    }[];
    timers: {
      id: string;
      started_at: Date;
      description: string | null;
      erp_hrm_employee_id: string;
      erp_hrm_project_id: string;
      erp_hrm_task_id: string | null;
      created_at: Date;
      updated_at: Date;
    }[];
    _count: {
      subtasks: number;
      taskHistories: number;
      timelogs: number;
      timers: number;
    };
  }): IErpHrmTask.ISummary => ({
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    project: buildProjectSummary(task.project),
    assignee: task.assignee ? buildEmployeeSummary(task.assignee) : null,
    due_date: task.due_date?.toISOString() ?? undefined,
    subtasks_count: task._count.subtasks,
    task_histories_count: task._count.taskHistories,
    timelogs_count: task._count.timelogs,
    timers_count: task._count.timers,
  });
  // Helper function to build timelog summary
  const buildTimelogSummary = (log: {
    id: string;
    date: Date;
    duration_minutes: number;
    description: string | null;
    billable: boolean;
    erp_hrm_employee_id: string;
    erp_hrm_project_id: string;
    erp_hrm_task_id: string | null;
    created_at: Date;
    updated_at: Date;
  }): IErpHrmTimelog.ISummary => ({
    id: log.id,
    date: log.date.toISOString(),
    duration_minutes: log.duration_minutes,
    description: log.description ?? undefined,
    billable: log.billable,
    project: buildProjectSummary(projectMember.project),
    task: null,
    employee: buildEmployeeSummary(projectMember.employee),
  });
  // Helper function to build timer summary
  const buildTimerSummary = (timer: {
    id: string;
    started_at: Date;
    description: string | null;
    erp_hrm_employee_id: string;
    erp_hrm_project_id: string;
    erp_hrm_task_id: string | null;
    created_at: Date;
    updated_at: Date;
  }): IErpHrmTimer.ISummary => ({
    id: timer.id,
    startedAt: timer.started_at.toISOString(),
    description: timer.description ?? undefined,
    project: buildProjectSummary(projectMember.project),
    task: null,
  });
  // Helper function to build project member (for nested projectMemberships)
  const buildProjectMemberSummary = (pm: {
    id: string;
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
          description: string | null;
          logo_uri: string | null;
          currency: string;
          timezone: string;
          fiscal_start_month: number;
          created_at: Date;
          owner_id: string;
        };
      };
      department: {
        id: string;
        name: string;
        description: string | null;
        created_at: Date;
        updated_at: Date;
        parent: {
          id: string;
          name: string;
          description: string | null;
          created_at: Date;
          updated_at: Date;
        } | null;
      } | null;
    };
    project: {
      id: string;
      name: string;
      description: string | null;
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
      _count: {
        projectMemberships: number;
        tasks: number;
        timelogs: number;
        timers: number;
      };
    };
  }): IErpHrmProjectMember => ({
    id: pm.project.id,
    name: pm.project.name,
    description: pm.project.description ?? undefined,
    color: pm.project.color,
    status: pm.project.status,
    budget_hours: pm.project.budget_hours ?? undefined,
    start_date: pm.project.start_date?.toISOString() ?? null,
    end_date: pm.project.end_date?.toISOString() ?? null,
    created_at: pm.project.created_at.toISOString(),
    updated_at: pm.project.updated_at.toISOString(),
    organization: buildOrganizationSummary(pm.project.organization),
    project_members_count: pm.project._count.projectMemberships,
    projectMemberships: [],
    tasks_count: pm.project._count.tasks,
    tasks: [],
    timelogs: [],
    timers: [],
  });
  // Build the organization summary for the main project
  const organizationSummary = buildOrganizationSummary(
    projectMember.project.organization,
  );
  // Build and return the complete IErpHrmProjectMember response
  return {
    id: projectMember.project.id,
    name: projectMember.project.name,
    description: projectMember.project.description ?? undefined,
    color: projectMember.project.color,
    status: projectMember.project.status,
    budget_hours: projectMember.project.budget_hours ?? undefined,
    start_date: projectMember.project.start_date?.toISOString() ?? null,
    end_date: projectMember.project.end_date?.toISOString() ?? null,
    created_at: projectMember.project.created_at.toISOString(),
    updated_at: projectMember.project.updated_at.toISOString(),
    organization: organizationSummary,
    project_members_count: projectMember.project._count.projectMemberships,
    projectMemberships: projectMember.project.projectMemberships.map(
      buildProjectMemberSummary,
    ),
    tasks_count: projectMember.project._count.tasks,
    tasks: projectMember.project.tasks.map(buildTaskSummary),
    timelogs: projectMember.project.timelogs.map(buildTimelogSummary),
    timers: projectMember.project.timers.map(buildTimerSummary),
  };
}
