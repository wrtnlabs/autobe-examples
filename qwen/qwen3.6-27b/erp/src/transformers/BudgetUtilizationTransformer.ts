import { IBudgetUtilization } from "@ORGANIZATION/PROJECT-api/lib/structures/IBudgetUtilization";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace BudgetUtilizationTransformer {
  export type Payload = Prisma.hrm_platform_projectsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        budget: true,
        timelogs: {
          select: {
            duration_minutes: true,
            deleted_at: true,
          },
        } satisfies Prisma.hrm_platform_timelogsFindManyArgs,
      },
    } satisfies Prisma.hrm_platform_projectsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IBudgetUtilization> {
    const actualMinutes = input.timelogs
      .filter((tl) => tl.deleted_at === null)
      .reduce((sum, tl) => sum + tl.duration_minutes, 0);
    const actualHours = actualMinutes / 60;
    const budgetHours = input.budget ?? null;
    const percentageConsumed =
      budgetHours !== null && budgetHours > 0
        ? (actualHours / budgetHours) * 100
        : null;
    return {
      projectId: input.id,
      projectName: input.name,
      budgetHours,
      actualHours,
      percentageConsumed,
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace BudgetUtilizationTransformer {
//       export type Payload = Prisma.hrm_platform_projectsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             color_code: true,
//             budget: true,
//             status: true,
//             start_date: true,
//             end_date: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             hrm_platform_organization_id: true,
//           },
//         } satisfies Prisma.hrm_platform_projectsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IBudgetUtilization> {
//         return {
//   projectId: {string},
//   projectName: {string},
//   budgetHours: {number | null},
//   actualHours: {number},
//   percentageConsumed: {number | null},
//         };
//       }
//     }
//--------------------------------------------------------------