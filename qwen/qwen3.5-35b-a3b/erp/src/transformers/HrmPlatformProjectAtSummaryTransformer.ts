import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmPlatformProjectAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_projectsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        status: true,
        color_code: true,
        description: true,
        budget_hours: true,
        start_date: true,
        end_date: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: true,
        memberships: true,
        tasks: true,
        timers: true,
        timelogs: {
          select: {
            id: true,
            billable: true,
            employee_id: true,
            duration_minutes: true,
          },
        },
      },
    } satisfies Prisma.hrm_platform_projectsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformProject.ISummary> {
    const timelogs = input.timelogs;
    const totalHours: number =
      timelogs.reduce((sum, t) => sum + t.duration_minutes, 0) / 60;
    const billableHours: number =
      timelogs
        .filter((t) => t.billable)
        .reduce((sum, t) => sum + t.duration_minutes, 0) / 60;
    const nonBillableHours: number =
      timelogs
        .filter((t) => !t.billable)
        .reduce((sum, t) => sum + t.duration_minutes, 0) / 60;
    const timelogCount = timelogs.length;
    const uniqueEmployeeIds = new Set(timelogs.map((t) => t.employee_id));
    const employeeCount = uniqueEmployeeIds.size;
    const budgetUtilization =
      input.budget_hours !== null && input.budget_hours !== undefined
        ? Math.min(
            Math.round((totalHours / Number(input.budget_hours)) * 100) / 100,
            100,
          )
        : null;
    return {
      id: input.id,
      name: input.name,
      status: input.status,
      color_code: input.color_code,
      budget_hours:
        input.budget_hours !== null ? Number(input.budget_hours) : null,
      start_date: input.start_date?.toISOString() ?? null,
      end_date: input.end_date?.toISOString() ?? null,
      description: input.description ?? null,
      total_hours: totalHours,
      billable_hours: billableHours,
      non_billable_hours: nonBillableHours,
      timelog_count: timelogCount,
      employee_count: employeeCount,
      budget_utilization: budgetUtilization,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IHrmPlatformProject.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformProjectAtSummaryTransformer {
//       export type Payload = Prisma.hrm_platform_projectsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             color_code: true,
//             description: true,
//             budget_hours: true,
//             start_date: true,
//             end_date: true,
//             status: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             organization_id: true,
//           },
//         } satisfies Prisma.hrm_platform_projectsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformProject.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   status: {string},
//   color_code: {string},
//   budget_hours: {number | null},
//   start_date: {string | null},
//   end_date: {string | null},
//   description: {string | null},
//   total_hours: {number},
//   billable_hours: {number},
//   non_billable_hours: {number},
//   timelog_count: {integer},
//   employee_count: {integer},
//   budget_utilization: {number | null},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------