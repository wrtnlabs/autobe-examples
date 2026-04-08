import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmPlatformTimerTransformer {
  export type Payload = Prisma.hrm_platform_timersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        last_tick_at: true,
        duration_seconds: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        hrm_platform_employee_id: true,
        hrm_platform_project_id: true,
        hrm_platform_task_id: true,
        employee: { select: { id: true } },
        project: {
          select: { id: true },
        } satisfies Prisma.hrm_platform_projectsFindManyArgs,
        task: {
          select: { id: true },
        } satisfies Prisma.hrm_platform_tasksFindManyArgs,
      },
    } satisfies Prisma.hrm_platform_timersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmPlatformTimer> {
    return {
      id: input.id,
      duration_seconds: input.duration_seconds,
      last_tick_at: toISOStringSafe(input.last_tick_at),
      status: input.status,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      hrm_platform_employee_id:
        input.hrm_platform_employee_id ?? ("" as string & tags.Format<"uuid">),
      hrm_platform_project_id:
        input.hrm_platform_project_id ?? ("" as string & tags.Format<"uuid">),
      hrm_platform_task_id:
        input.hrm_platform_task_id ?? ("" as string & tags.Format<"uuid">),
    } satisfies IHrmPlatformTimer;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformTimerTransformer {
//       export type Payload = Prisma.hrm_platform_timersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             duration_seconds: true,
//             last_tick_at: true,
//             status: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             hrm_platform_employee_id: true,
//             hrm_platform_project_id: true,
//             hrm_platform_task_id: true,
//           },
//         } satisfies Prisma.hrm_platform_timersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformTimer> {
//         return {
//   id: {string},
//   duration_seconds: {integer},
//   last_tick_at: {string},
//   status: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   hrm_platform_employee_id: {string},
//   hrm_platform_project_id: {string},
//   hrm_platform_task_id: {string},
//         };
//       }
//     }
//--------------------------------------------------------------