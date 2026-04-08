import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTimesheetWeeklyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheetWeeklyStat";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimesheetWeeklyStatAtSummaryTransformer } from "../transformers/HrmPlatformTimesheetWeeklyStatAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberTimetrackingWeeklyHoursEmployeeId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformTimesheetWeeklyStat.ISummary> {
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        id: props.employeeId,
        deleted_at: null,
      },
      select: {
        id: true,
        employee_code: true,
        display_name: true,
        email: true,
        phone_number: true,
        job_title: true,
        job_level: true,
        employment_type: true,
        status: true,
        start_date: true,
        end_date: true,
        is_pending: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: {
          select: {
            id: true,
            email: true,
            display_name: true,
            avatar_uri: true,
            phone_number: true,
            is_active: true,
            last_login_at: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
            role_kind: true,
            organization: {
              select: {
                id: true,
                name: true,
                description: true,
                currency: true,
                timezone: true,
                fiscal_start_month: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                owner: {
                  select: {
                    id: true,
                    email: true,
                    display_name: true,
                    avatar_uri: true,
                    phone_number: true,
                    is_active: true,
                    last_login_at: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                },
              },
            },
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            organization: {
              select: {
                id: true,
                name: true,
                description: true,
                currency: true,
                timezone: true,
                fiscal_start_month: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                owner: {
                  select: {
                    id: true,
                    email: true,
                    display_name: true,
                    avatar_uri: true,
                    phone_number: true,
                    is_active: true,
                    last_login_at: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                },
              },
            },
            parentDepartment: {
              select: {
                id: true,
                name: true,
                organization: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    currency: true,
                    timezone: true,
                    fiscal_start_month: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                    owner: {
                      select: {
                        id: true,
                        email: true,
                        display_name: true,
                        avatar_uri: true,
                        phone_number: true,
                        is_active: true,
                        last_login_at: true,
                        created_at: true,
                        updated_at: true,
                        deleted_at: true,
                      },
                    },
                  },
                },
                parentDepartment: true,
                created_at: true,
                updated_at: true,
              },
            },
            created_at: true,
            updated_at: true,
          },
        },
      },
    });
  const organization =
    await MyGlobal.prisma.hrm_platform_organizations.findUniqueOrThrow({
      where: {
        id: employee.role.organization.id,
      },
      select: {
        id: true,
        name: true,
        description: true,
        currency: true,
        timezone: true,
        fiscal_start_month: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        owner: {
          select: {
            id: true,
            email: true,
            display_name: true,
            avatar_uri: true,
            phone_number: true,
            is_active: true,
            last_login_at: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });
  const weekStart = calculateWeekStartForTimezone(
    organization.timezone ?? "UTC",
  );
  const record =
    await MyGlobal.prisma.hrm_platform_timesheet_weekly_stats.findFirst({
      ...HrmPlatformTimesheetWeeklyStatAtSummaryTransformer.select(),
      where: {
        employee_id: props.employeeId,
        week_start: weekStart,
      },
    });
  if (record === null) {
    return createDefaultTimesheetWeeklyStat(weekStart, organization, employee);
  }
  return await HrmPlatformTimesheetWeeklyStatAtSummaryTransformer.transform(
    record,
  );
}
function calculateWeekStartForTimezone(
  timezone: string,
): string & tags.Format<"date-time"> {
  const now = new Date();
  const utcTime = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds(),
    now.getUTCMilliseconds(),
  );
  const offset = getOffsetFromTimezone(timezone);
  const localTime = new Date(utcTime + offset * 60 * 1000);
  const dayOfWeek = localTime.getUTCDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(
    Date.UTC(
      localTime.getUTCFullYear(),
      localTime.getUTCMonth(),
      localTime.getUTCDate() - daysSinceMonday,
      0,
      0,
      0,
      0,
    ),
  );
  return toISOStringSafe(monday);
}
function getOffsetFromTimezone(timezone: string): number {
  try {
    const testDate = new Date();
    const utc = testDate.getTime() + testDate.getTimezoneOffset() * 60000;
    const local = new Date(utc).toLocaleString("en-US", { timeZone: timezone });
    const localDate = new Date(local);
    const offset = (localDate.getTime() - utc) / 60000;
    return offset;
  } catch {
    return 0;
  }
}
function createDefaultTimesheetWeeklyStat(
  weekStart: string & tags.Format<"date-time">,
  organization: Prisma.hrm_platform_organizationsGetPayload<{
    select: {
      id: true;
      name: true;
      description: true;
      currency: true;
      timezone: true;
      fiscal_start_month: true;
      created_at: true;
      updated_at: true;
      deleted_at: true;
      owner: {
        select: {
          id: true;
          email: true;
          display_name: true;
          avatar_uri: true;
          phone_number: true;
          is_active: true;
          last_login_at: true;
          created_at: true;
          updated_at: true;
          deleted_at: true;
        };
      };
    };
  }>,
  employee: Prisma.hrm_platform_employeesGetPayload<{
    select: {
      id: true;
      employee_code: true;
      display_name: true;
      email: true;
      phone_number: true;
      job_title: true;
      job_level: true;
      employment_type: true;
      status: true;
      start_date: true;
      end_date: true;
      is_pending: true;
      created_at: true;
      updated_at: true;
      deleted_at: true;
      member: {
        select: {
          id: true;
          email: true;
          display_name: true;
          avatar_uri: true;
          phone_number: true;
          is_active: true;
          last_login_at: true;
          created_at: true;
          updated_at: true;
          deleted_at: true;
        };
      };
      role: {
        select: {
          id: true;
          name: true;
          role_kind: true;
          organization: {
            select: {
              id: true;
              name: true;
              description: true;
              currency: true;
              timezone: true;
              fiscal_start_month: true;
              created_at: true;
              updated_at: true;
              deleted_at: true;
              owner: {
                select: {
                  id: true;
                  email: true;
                  display_name: true;
                  avatar_uri: true;
                  phone_number: true;
                  is_active: true;
                  last_login_at: true;
                  created_at: true;
                  updated_at: true;
                  deleted_at: true;
                };
              };
            };
          };
        };
      };
      department: {
        select: {
          id: true;
          name: true;
          organization: {
            select: {
              id: true;
              name: true;
              description: true;
              currency: true;
              timezone: true;
              fiscal_start_month: true;
              created_at: true;
              updated_at: true;
              deleted_at: true;
              owner: {
                select: {
                  id: true;
                  email: true;
                  display_name: true;
                  avatar_uri: true;
                  phone_number: true;
                  is_active: true;
                  last_login_at: true;
                  created_at: true;
                  updated_at: true;
                  deleted_at: true;
                };
              };
            };
          };
          parentDepartment: {
            select: {
              id: true;
              name: true;
              organization: {
                select: {
                  id: true;
                  name: true;
                  description: true;
                  currency: true;
                  timezone: true;
                  fiscal_start_month: true;
                  created_at: true;
                  updated_at: true;
                  deleted_at: true;
                  owner: {
                    select: {
                      id: true;
                      email: true;
                      display_name: true;
                      avatar_uri: true;
                      phone_number: true;
                      is_active: true;
                      last_login_at: true;
                      created_at: true;
                      updated_at: true;
                      deleted_at: true;
                    };
                  };
                };
              };
              parentDepartment: true;
              created_at: true;
              updated_at: true;
            };
          };
          created_at: true;
          updated_at: true;
        };
      };
    };
  }>,
): IHrmPlatformTimesheetWeeklyStat.ISummary {
  const weekEndOffset = addDays(weekStart, 6);
  const organizationSummary = {
    id: organization.id,
    name: organization.name,
    description: organization.description,
    currency: organization.currency,
    timezone: organization.timezone,
    fiscal_start_month: organization.fiscal_start_month,
    created_at: toISOStringSafe(organization.created_at),
    updated_at: toISOStringSafe(organization.updated_at),
    deleted_at:
      organization.deleted_at != null
        ? toISOStringSafe(organization.deleted_at)
        : null,
    owner: {
      id: organization.owner.id,
      email: organization.owner.email,
      display_name: organization.owner.display_name ?? undefined,
      avatar_uri: organization.owner.avatar_uri ?? undefined,
      phone_number: organization.owner.phone_number ?? undefined,
      is_active: organization.owner.is_active,
      last_login_at:
        organization.owner.last_login_at != null
          ? toISOStringSafe(organization.owner.last_login_at)
          : null,
      created_at: toISOStringSafe(organization.owner.created_at),
      updated_at: toISOStringSafe(organization.owner.updated_at),
      deleted_at:
        organization.owner.deleted_at != null
          ? toISOStringSafe(organization.owner.deleted_at)
          : null,
    } satisfies IHrmPlatformMember.ISummary,
  } satisfies IHrmPlatformOrganization.ISummary;
  const employeeSummary = {
    id: employee.id,
    employee_code: employee.employee_code,
    display_name: employee.display_name,
    email: employee.email,
    phone_number: employee.phone_number ?? undefined,
    job_title: employee.job_title ?? undefined,
    job_level: employee.job_level,
    employment_type: employee.employment_type,
    status: employee.status,
    start_date: toISOStringSafe(employee.start_date),
    end_date:
      employee.end_date != null ? toISOStringSafe(employee.end_date) : null,
    is_pending: employee.is_pending,
    created_at: toISOStringSafe(employee.created_at),
    updated_at: toISOStringSafe(employee.updated_at),
    deleted_at:
      employee.deleted_at != null ? toISOStringSafe(employee.deleted_at) : null,
    member: {
      id: employee.member.id,
      email: employee.member.email,
      display_name: employee.member.display_name ?? undefined,
      avatar_uri: employee.member.avatar_uri ?? undefined,
      phone_number: employee.member.phone_number ?? undefined,
      is_active: employee.member.is_active,
      last_login_at:
        employee.member.last_login_at != null
          ? toISOStringSafe(employee.member.last_login_at)
          : null,
      created_at: toISOStringSafe(employee.member.created_at),
      updated_at: toISOStringSafe(employee.member.updated_at),
      deleted_at:
        employee.member.deleted_at != null
          ? toISOStringSafe(employee.member.deleted_at)
          : null,
    } satisfies IHrmPlatformMember.ISummary,
    role: {
      id: employee.role.id,
      name: employee.role.name,
      role_kind: employee.role.role_kind,
      permissions_count: 0,
      organization: {
        id: employee.role.organization.id,
        name: employee.role.organization.name,
        description: employee.role.organization.description ?? undefined,
        currency: employee.role.organization.currency,
        timezone: employee.role.organization.timezone,
        fiscal_start_month: employee.role.organization.fiscal_start_month,
        created_at: toISOStringSafe(employee.role.organization.created_at),
        updated_at: toISOStringSafe(employee.role.organization.updated_at),
        deleted_at:
          employee.role.organization.deleted_at != null
            ? toISOStringSafe(employee.role.organization.deleted_at)
            : null,
        owner: {
          id: employee.role.organization.owner.id,
          email: employee.role.organization.owner.email,
          display_name:
            employee.role.organization.owner.display_name ?? undefined,
          avatar_uri: employee.role.organization.owner.avatar_uri ?? undefined,
          phone_number:
            employee.role.organization.owner.phone_number ?? undefined,
          is_active: employee.role.organization.owner.is_active,
          last_login_at:
            employee.role.organization.owner.last_login_at != null
              ? toISOStringSafe(employee.role.organization.owner.last_login_at)
              : null,
          created_at: toISOStringSafe(
            employee.role.organization.owner.created_at,
          ),
          updated_at: toISOStringSafe(
            employee.role.organization.owner.updated_at,
          ),
          deleted_at:
            employee.role.organization.owner.deleted_at != null
              ? toISOStringSafe(employee.role.organization.owner.deleted_at)
              : null,
        } satisfies IHrmPlatformMember.ISummary,
      } satisfies IHrmPlatformOrganization.ISummary,
    } satisfies IHrmPlatformRole.ISummary,
    department:
      employee.department != null
        ? ({
            id: employee.department.id,
            name: employee.department.name,
            organization: {
              id: employee.department.organization.id,
              name: employee.department.organization.name,
              description:
                employee.department.organization.description ?? undefined,
              currency: employee.department.organization.currency,
              timezone: employee.department.organization.timezone,
              fiscal_start_month:
                employee.department.organization.fiscal_start_month,
              created_at: toISOStringSafe(
                employee.department.organization.created_at,
              ),
              updated_at: toISOStringSafe(
                employee.department.organization.updated_at,
              ),
              deleted_at:
                employee.department.organization.deleted_at != null
                  ? toISOStringSafe(employee.department.organization.deleted_at)
                  : null,
              owner: {
                id: employee.department.organization.owner.id,
                email: employee.department.organization.owner.email,
                display_name:
                  employee.department.organization.owner.display_name ??
                  undefined,
                avatar_uri:
                  employee.department.organization.owner.avatar_uri ??
                  undefined,
                phone_number:
                  employee.department.organization.owner.phone_number ??
                  undefined,
                is_active: employee.department.organization.owner.is_active,
                last_login_at:
                  employee.department.organization.owner.last_login_at != null
                    ? toISOStringSafe(
                        employee.department.organization.owner.last_login_at,
                      )
                    : null,
                created_at: toISOStringSafe(
                  employee.department.organization.owner.created_at,
                ),
                updated_at: toISOStringSafe(
                  employee.department.organization.owner.updated_at,
                ),
                deleted_at:
                  employee.department.organization.owner.deleted_at != null
                    ? toISOStringSafe(
                        employee.department.organization.owner.deleted_at,
                      )
                    : null,
              } satisfies IHrmPlatformMember.ISummary,
            } satisfies IHrmPlatformOrganization.ISummary,
            parentDepartment: null,
            created_at: toISOStringSafe(employee.department.created_at),
            updated_at: toISOStringSafe(employee.department.updated_at),
          } satisfies IHrmPlatformDepartment.ISummary)
        : null,
    organization: organizationSummary,
  } satisfies IHrmPlatformEmployee.ISummary;
  return {
    id: v4() as string & tags.Format<"uuid">,
    organization: organizationSummary,
    employee: employeeSummary,
    week_start: weekStart,
    week_end: weekEndOffset,
    timesheet_count: 0,
    total_hours: 0,
    billable_hours: 0,
    draft_timesheet_count: 0,
    submitted_timesheet_count: 0,
    approved_timesheet_count: 0,
    rejected_timesheet_count: 0,
    last_refreshed_at: weekStart,
  } satisfies IHrmPlatformTimesheetWeeklyStat.ISummary;
}
function addDays(
  date: string & tags.Format<"date-time">,
  days: number,
): string & tags.Format<"date-time"> {
  const inputDate = new Date(date);
  inputDate.setDate(inputDate.getDate() + days);
  return toISOStringSafe(inputDate);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IHrmPlatformTimesheetWeeklyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheetWeeklyStat";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmPlatformMemberTimetrackingWeeklyHoursEmployeeId(props: {
//   member: MemberPayload;
//   employeeId: string & tags.Format<"uuid">;
// }): Promise<IHrmPlatformTimesheetWeeklyStat.ISummary> {
//   const record = await MyGlobal.prisma.hrm_platform_timesheet_weekly_stats.findFirstOrThrow({
//     ...HrmPlatformTimesheetWeeklyStatAtSummaryTransformer.select(),
//     where: { ... },
//   });
//   return await HrmPlatformTimesheetWeeklyStatAtSummaryTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------