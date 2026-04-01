import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimesheetAtSummaryTransformer } from "../transformers/HrmPlatformTimesheetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberTimesheets(props: {
  member: MemberPayload;
  body: IHrmPlatformTimesheet.IRequest;
}): Promise<IPageIHrmPlatformTimesheet.ISummary> {
  // Get member's employee record
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_platform_organization_id: true,
      hrm_platform_role_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Member not enrolled in any organization", 403);
  }
  // Check time:approve permission
  const role = await MyGlobal.prisma.hrm_platform_roles.findUnique({
    where: { id: employee.hrm_platform_role_id },
    include: {
      permissions: {
        select: {
          permission: {
            select: { code: true },
          },
        },
      },
    },
  });
  const hasTimeApprovePermission = role?.permissions.some(
    (rp) => rp.permission.code === "time:approve",
  );
  // Build where clause
  const whereInput: Prisma.hrm_platform_timesheetsWhereInput = {
    deleted_at: null,
    hrm_platform_employee_id: hasTimeApprovePermission
      ? undefined
      : employee.id,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.week_start_date && {
      week_start_date: {
        ...(props.body.week_start_date.gte && {
          gte: props.body.week_start_date.gte,
        }),
        ...(props.body.week_start_date.lte && {
          lte: props.body.week_start_date.lte,
        }),
      },
    }),
    ...(props.body.week_end_date && {
      week_end_date: {
        ...(props.body.week_end_date.gte && {
          gte: props.body.week_end_date.gte,
        }),
        ...(props.body.week_end_date.lte && {
          lte: props.body.week_end_date.lte,
        }),
      },
    }),
  } satisfies Prisma.hrm_platform_timesheetsWhereInput;
  // Handle pagination
  const limit = props.body.limit ?? 20;
  const page = props.body.page ?? 1;
  const skip = (page - 1) * limit;
  // Build orderBy
  const orderByInput: Prisma.hrm_platform_timesheetsOrderByWithRelationInput = {
    week_start_date: props.body.order ?? "desc",
  } satisfies Prisma.hrm_platform_timesheetsOrderByWithRelationInput;
  // Build select configuration manually to match transformer expectations
  const selectInput: Prisma.hrm_platform_timesheetsSelect = {
    id: true,
    created_at: true,
    updated_at: true,
    deleted_at: true,
    status: true,
    week_start_date: true,
    week_end_date: true,
    submitted_at: true,
    reviewed_at: true,
    rejection_reason: true,
    hrm_platform_employee_id: true,
    hrm_platform_member_id: true,
    employee: {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        position: true,
        employment_type: true,
        status: true,
        user: {
          select: {
            id: true,
            email: true,
            password_hash: true,
            display_name: true,
            avatar_image: true,
            phone_number: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            sessions: true,
            passwordResets: true,
            emailVerifications: true,
            employees: true,
            employeeSnapshots: true,
            taskHistories: true,
            reviewedTimesheets: true,
            activityLogs: true,
          },
        },
        organization: {
          select: {
            id: true,
          },
        },
        role: {
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            is_builtin: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            organization: true,
            employeeAssignments: true,
            employeeSnapshots: true,
            permissions: {
              select: {
                permission: {
                  select: {
                    code: true,
                  },
                },
              },
            },
          },
        },
        department: true,
        contracts: true,
        snapshots: true,
        projectMemberships: true,
        assignedTasks: true,
        timelogs: true,
        timesheets: true,
        activeTimers: true,
      },
    },
    reviewer: {
      select: {
        id: true,
        email: true,
        password_hash: true,
        display_name: true,
        avatar_image: true,
        phone_number: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: true,
        passwordResets: true,
        emailVerifications: true,
        employees: true,
        employeeSnapshots: true,
        taskHistories: true,
        reviewedTimesheets: true,
        activityLogs: true,
      },
    },
    timesheetTimelogs: {
      select: {
        timelog: {
          select: {
            duration_minutes: true,
          },
        },
      },
    },
  };
  // Query timesheets
  const [timesheets, total] = await Promise.all([
    MyGlobal.prisma.hrm_platform_timesheets.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      select: selectInput,
    }),
    MyGlobal.prisma.hrm_platform_timesheets.count({ where: whereInput }),
  ]);
  // Transform results - cast to expected type for transformer
  const data = await ArrayUtil.asyncMap(
    timesheets as unknown as Array<{
      created_at: Date;
      id: string;
      status: string;
      updated_at: Date;
      deleted_at: Date | null;
      week_start_date: Date;
      week_end_date: Date;
      submitted_at: Date | null;
      employee: {
        created_at: Date;
        id: string;
        position: string | null;
        employment_type: string;
        status: string;
        updated_at: Date;
        deleted_at: Date | null;
        user: {
          email: string;
          created_at: Date;
          id: string;
          updated_at: Date;
          deleted_at: Date | null;
          password_hash: string;
          display_name: string;
          avatar_image: string | null;
          phone_number: string | null;
          sessions: {
            created_at: Date;
            id: string;
            hrm_platform_member_id: string;
            ip: string;
            href: string | null;
            referrer: string | null;
            expired_at: Date;
          }[];
          passwordResets: {
            created_at: Date;
            id: string;
            hrm_platform_member_id: string;
            token: string;
            expires_at: Date;
          }[];
          emailVerifications: {
            created_at: Date;
            id: string;
            updated_at: Date;
            deleted_at: Date | null;
            hrm_platform_member_id: string;
            token: string;
            expires_at: Date;
            verified_at: Date | null;
          }[];
          employees: {
            created_at: Date;
            id: string;
            hrm_platform_user_id: string;
            hrm_platform_organization_id: string;
            hrm_platform_role_id: string;
            hrm_platform_department_id: string | null;
            position: string | null;
            employment_type: string;
            status: string;
            updated_at: Date;
            deleted_at: Date | null;
          }[];
          employeeSnapshots: {
            created_at: Date;
            id: string;
            hrm_platform_user_id: string;
            hrm_platform_organization_id: string;
            hrm_platform_role_id: string;
            hrm_platform_department_id: string | null;
            position: string | null;
            employment_type: string;
            status: string;
            updated_at: Date;
            deleted_at: Date | null;
            hrm_platform_employee_id: string;
          }[];
          taskHistories: {
            created_at: Date;
            id: string;
            updated_at: Date;
            deleted_at: Date | null;
            hrm_platform_task_id: string;
            hrm_platform_member_id: string;
            changed_at: Date;
            old_status: string;
            new_status: string;
          }[];
          reviewedTimesheets: {
            created_at: Date;
            id: string;
            status: string;
            updated_at: Date;
            deleted_at: Date | null;
            week_start_date: Date;
            week_end_date: Date;
            submitted_at: Date | null;
            hrm_platform_employee_id: string;
            hrm_platform_member_id: string | null;
            reviewed_at: Date | null;
            rejection_reason: string | null;
          }[];
          activityLogs: {
            created_at: Date;
            id: string;
            organization_id: string;
            user_id: string;
            action_type: string;
            target_entity: string;
            target_id: string | null;
            details: string | null;
          }[];
        };
        organization: {
          id: string;
        };
        role: {
          name: string;
          created_at: Date;
          id: string;
          updated_at: Date;
          deleted_at: Date | null;
          organization: {
            name: string;
            created_at: Date;
            timezone: string;
            id: string;
            updated_at: Date;
            deleted_at: Date | null;
            description: string | null;
            logo_url: string | null;
            currency: string;
            fiscal_start_month: number;
          };
          description: string | null;
          employeeSnapshots: {
            created_at: Date;
            id: string;
            hrm_platform_user_id: string;
            hrm_platform_organization_id: string;
            hrm_platform_role_id: string;
            hrm_platform_department_id: string | null;
            position: string | null;
            employment_type: string;
            status: string;
            updated_at: Date;
            deleted_at: Date | null;
            hrm_platform_employee_id: string;
          }[];
          code: string;
          is_builtin: boolean;
          employeeAssignments: {
            created_at: Date;
            id: string;
            hrm_platform_user_id: string;
            hrm_platform_organization_id: string;
            hrm_platform_role_id: string;
            hrm_platform_department_id: string | null;
            position: string | null;
            employment_type: string;
            status: string;
            updated_at: Date;
            deleted_at: Date | null;
          }[];
          permissions: {
            permission: {
              code: string;
            };
          }[];
        };
        department: {
          name: string;
          created_at: Date;
          id: string;
          hrm_platform_organization_id: string;
          updated_at: Date;
          deleted_at: Date | null;
          description: string | null;
          parent_department_id: string | null;
        } | null;
        contracts: {
          created_at: Date;
          id: string;
          updated_at: Date;
          deleted_at: Date | null;
          start_date: Date;
          end_date: Date | null;
          hrm_platform_employee_id: string;
          pay_rate: number;
          pay_period: string;
          working_hours_per_week: number;
          notes: string | null;
        }[];
        snapshots: {
          created_at: Date;
          id: string;
          hrm_platform_user_id: string;
          hrm_platform_organization_id: string;
          hrm_platform_role_id: string;
          hrm_platform_department_id: string | null;
          position: string | null;
          employment_type: string;
          status: string;
          updated_at: Date;
          deleted_at: Date | null;
          hrm_platform_employee_id: string;
        }[];
        projectMemberships: {
          created_at: Date;
          id: string;
          updated_at: Date;
          deleted_at: Date | null;
          role: string;
          hrm_platform_employee_id: string;
          hrm_platform_project_id: string;
        }[];
        assignedTasks: {
          created_at: Date;
          due_date: Date | null;
          priority: string;
          id: string;
          status: string;
          updated_at: Date;
          deleted_at: Date | null;
          description: string | null;
          hrm_platform_projects_id: string;
          hrm_platform_tasks_id: string | null;
          hrm_platform_employees_id: string | null;
          title: string;
          estimated_hours: number | null;
        }[];
        timelogs: {
          date: Date;
          created_at: Date;
          id: string;
          updated_at: Date;
          deleted_at: Date | null;
          description: string | null;
          hrm_platform_employee_id: string;
          hrm_platform_project_id: string;
          hrm_platform_task_id: string | null;
          duration_minutes: number;
          billable: boolean;
        }[];
        timesheets: {
          created_at: Date;
          id: string;
          status: string;
          updated_at: Date;
          deleted_at: Date | null;
          week_start_date: Date;
          week_end_date: Date;
          submitted_at: Date | null;
          hrm_platform_employee_id: string;
          hrm_platform_member_id: string | null;
          reviewed_at: Date | null;
          rejection_reason: string | null;
        }[];
        activeTimers: {
          created_at: Date;
          id: string;
          updated_at: Date;
          deleted_at: Date | null;
          description: string | null;
          started_at: Date;
          stopped_at: Date | null;
          employee_id: string;
          project_id: string;
          task_id: string | null;
        }[];
      };
      timesheetTimelogs: {
        timelog: {
          duration_minutes: number;
        };
      }[];
      reviewed_at: Date | null;
      rejection_reason: string | null;
      reviewer: {
        email: string;
        created_at: Date;
        id: string;
        updated_at: Date;
        deleted_at: Date | null;
        password_hash: string;
        display_name: string;
        avatar_image: string | null;
        phone_number: string | null;
        sessions: {
          created_at: Date;
          id: string;
          hrm_platform_member_id: string;
          ip: string;
          href: string | null;
          referrer: string | null;
          expired_at: Date;
        }[];
        passwordResets: {
          created_at: Date;
          id: string;
          hrm_platform_member_id: string;
          token: string;
          expires_at: Date;
        }[];
        emailVerifications: {
          created_at: Date;
          id: string;
          updated_at: Date;
          deleted_at: Date | null;
          hrm_platform_member_id: string;
          token: string;
          expires_at: Date;
          verified_at: Date | null;
        }[];
        employees: {
          created_at: Date;
          id: string;
          hrm_platform_user_id: string;
          hrm_platform_organization_id: string;
          hrm_platform_role_id: string;
          hrm_platform_department_id: string | null;
          position: string | null;
          employment_type: string;
          status: string;
          updated_at: Date;
          deleted_at: Date | null;
        }[];
        employeeSnapshots: {
          created_at: Date;
          id: string;
          hrm_platform_user_id: string;
          hrm_platform_organization_id: string;
          hrm_platform_role_id: string;
          hrm_platform_department_id: string | null;
          position: string | null;
          employment_type: string;
          status: string;
          updated_at: Date;
          deleted_at: Date | null;
          hrm_platform_employee_id: string;
        }[];
        taskHistories: {
          created_at: Date;
          id: string;
          updated_at: Date;
          deleted_at: Date | null;
          hrm_platform_task_id: string;
          hrm_platform_member_id: string;
          changed_at: Date;
          old_status: string;
          new_status: string;
        }[];
        reviewedTimesheets: {
          created_at: Date;
          id: string;
          status: string;
          updated_at: Date;
          deleted_at: Date | null;
          week_start_date: Date;
          week_end_date: Date;
          submitted_at: Date | null;
          hrm_platform_employee_id: string;
          hrm_platform_member_id: string | null;
          reviewed_at: Date | null;
          rejection_reason: string | null;
        }[];
        activityLogs: {
          created_at: Date;
          id: string;
          organization_id: string;
          user_id: string;
          action_type: string;
          target_entity: string;
          target_id: string | null;
          details: string | null;
        }[];
      } | null;
    }>,
    HrmPlatformTimesheetAtSummaryTransformer.transform,
  );
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIHrmPlatformTimesheet.ISummary;
}
