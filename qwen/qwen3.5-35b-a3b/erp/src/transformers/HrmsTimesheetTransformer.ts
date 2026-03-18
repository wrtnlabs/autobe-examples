import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import { IHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimesheet";
import { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmsTimesheetTransformer {
  export type Payload = Prisma.hrms_timesheetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        employee: {
          select: {
            id: true,
            display_name: true,
            position: true,
            department_id: true,
            status: true,
            _count: {
              select: {
                timelogs: true,
              },
            },
          },
        } satisfies Prisma.hrms_employeesFindManyArgs,
        reviewer: {
          select: {
            id: true,
            email: true,
            display_name: true,
            avatar_uri: true,
            phone_number: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            _count: {
              select: {
                organizationMembers: true,
              },
            },
          },
        } satisfies Prisma.hrms_membersFindManyArgs,
        week_start_date: true,
        week_end_date: true,
        status: true,
        total_hours: true,
        submitted_at: true,
        reviewed_at: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.hrms_timesheetsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmsTimesheet> {
    const employeeData = input.employee;
    return {
      id: input.id,
      employee: {
        id: employeeData.id,
        display_name: employeeData.display_name,
        position: employeeData.position ?? undefined,
        department_id:
          employeeData.department_id ?? "00000000-0000-0000-0000-000000000000",
        status: employeeData.status,
        total_hours_logged: 0,
        timelog_count: employeeData._count.timelogs,
        timesheets_submitted: 0,
        timesheets_approved: 0,
        timesheets_pending: 0,
      },
      reviewer: input.reviewer
        ? {
            id: input.reviewer.id,
            email: input.reviewer.email,
            display_name: input.reviewer.display_name,
            avatar_uri: input.reviewer.avatar_uri ?? null,
            phone_number: input.reviewer.phone_number ?? null,
            organization_membership_count:
              input.reviewer._count.organizationMembers,
            created_at: toISOStringSafe(input.reviewer.created_at),
            updated_at: toISOStringSafe(input.reviewer.updated_at),
            deleted_at: input.reviewer.deleted_at
              ? toISOStringSafe(input.reviewer.deleted_at)
              : null,
          }
        : null,
      timelogs: [],
      week_start_date: toISOStringSafe(input.week_start_date),
      week_end_date: toISOStringSafe(input.week_end_date),
      status: input.status,
      total_hours: Number(input.total_hours),
      submitted_at: input.submitted_at
        ? toISOStringSafe(input.submitted_at)
        : undefined,
      reviewed_at: input.reviewed_at
        ? toISOStringSafe(input.reviewed_at)
        : undefined,
      rejection_reason: input.rejection_reason,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
