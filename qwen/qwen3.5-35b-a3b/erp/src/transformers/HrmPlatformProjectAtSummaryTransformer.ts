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
        color_code: true,
        description: true,
        budget_hours: true,
        start_date: true,
        end_date: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        timelogs: {
          select: {
            billable: true,
          },
        } satisfies Prisma.hrm_platform_timelogsFindManyArgs,
        _count: {
          select: {
            timelogs: true,
          },
        },
      },
    } satisfies Prisma.hrm_platform_projectsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformProject.ISummary> {
    const timelogs = input.timelogs ?? [];
    const totalHours = 0;
    const billableHours = 0;
    const nonBillableHours = 0;
    const employeeSet = new Set<string>();
    const budgetUtilization =
      input.budget_hours !== null && input.budget_hours !== undefined
        ? Math.min((totalHours / input.budget_hours) * 100, 100)
        : null;
    return {
      id: input.id,
      name: input.name,
      status: input.status,
      color_code: input.color_code,
      budget_hours: input.budget_hours ?? null,
      start_date:
        input.start_date !== null ? toISOStringSafe(input.start_date) : null,
      end_date:
        input.end_date !== null ? toISOStringSafe(input.end_date) : null,
      description: input.description ?? undefined,
      total_hours: totalHours,
      billable_hours: billableHours,
      non_billable_hours: nonBillableHours,
      timelog_count: input._count.timelogs,
      employee_count: 0,
      budget_utilization: budgetUtilization,
      created_at: toISOStringSafe(
        input.created_at ?? new Date("1970-01-01T00:00:00.000Z"),
      ),
      updated_at: toISOStringSafe(
        input.updated_at ?? new Date("1970-01-01T00:00:00.000Z"),
      ),
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
//             status: true,
//             color_code: true,
//             budget_hours: true,
//             start_date: true,
//             end_date: true,
//             description: true,
//             total_hours: true,
//             billable_hours: true,
//             non_billable_hours: true,
//             timelog_count: true,
//             employee_count: true,
//             budget_utilization: true,
//             created_at: true,
//             updated_at: true,
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