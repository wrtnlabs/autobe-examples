import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmProjectBudgetReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectBudgetReport";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmProjectBudgetReportTransformer {
  export type Payload = Prisma.hrm_projectsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
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
        projectMembers: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_project_membersFindManyArgs,
        tasks: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_tasksFindManyArgs,
        timelogs: {
          select: {
            duration_minutes: true,
          },
        } satisfies Prisma.hrm_timelogsFindManyArgs,
        activeTimers: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_active_timersFindManyArgs,
      },
    } satisfies Prisma.hrm_projectsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmProjectBudgetReport> {
    // Compute actual_hours from timelogs
    const actualHours =
      input.timelogs.reduce((sum, tl) => sum + tl.duration_minutes, 0) / 60;
    // Compute percentage_consumed with division by zero protection
    const percentageConsumed =
      input.budget_hours && input.budget_hours > 0
        ? (actualHours / input.budget_hours) * 100
        : 0;
    return {
      project_id: input.id,
      project_name: input.name,
      budget_hours: input.budget_hours ?? null,
      actual_hours: actualHours,
      percentage_consumed: percentageConsumed,
      project_color_code: input.color_code,
      project_status: input.status,
    } satisfies IHrmProjectBudgetReport;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmProjectBudgetReportTransformer {
//       export type Payload = Prisma.hrm_projectsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             color_code: true,
//             status: true,
//             budget_hours: true,
//             start_date: true,
//             end_date: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             hrm_organization_id: true,
//           },
//         } satisfies Prisma.hrm_projectsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmProjectBudgetReport> {
//         return {
//   project_id: {string},
//   project_name: {string},
//   budget_hours: {number | null},
//   actual_hours: {number},
//   percentage_consumed: {number},
//   project_color_code: {string},
//   project_status: {string},
//         };
//       }
//     }
//--------------------------------------------------------------