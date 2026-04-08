import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformMemberAtSummaryTransformer } from "./HrmPlatformMemberAtSummaryTransformer";
import { HrmPlatformTaskAtSummaryTransformer } from "./HrmPlatformTaskAtSummaryTransformer";

export namespace HrmPlatformTaskHistoryTransformer {
  export type Payload = Prisma.hrm_platform_task_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        details: true,
        created_at: true,
        updated_at: true,
        changed_at: true,
        deleted_at: true,
        status_after: true,
        status_before: true,
        task: HrmPlatformTaskAtSummaryTransformer.select(),
        actor: HrmPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_task_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformTaskHistory> {
    return {
      id: input.id,
      task: await HrmPlatformTaskAtSummaryTransformer.transform(input.task),
      actor: await HrmPlatformMemberAtSummaryTransformer.transform(input.actor),
      action_type: input.action_type,
      status_before: input.status_before ?? undefined,
      status_after: input.status_after ?? undefined,
      details: input.details ?? undefined,
      changed_at: toISOStringSafe(input.changed_at),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IHrmPlatformTaskHistory;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformTaskHistoryTransformer {
//       export type Payload = Prisma.hrm_platform_task_historiesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             action_type: true,
//             details: true,
//             created_at: true,
//             updated_at: true,
//             changed_at: true,
//             deleted_at: true,
//             status_after: true,
//             status_before: true,
//             task: HrmPlatformTaskAtSummaryTransformer.select(),
//             actor: HrmPlatformMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_platform_task_historiesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformTaskHistory> {
//         return {
//   id: {string},
//   task: await HrmPlatformTaskAtSummaryTransformer.transform(input.task),
//   actor: await HrmPlatformMemberAtSummaryTransformer.transform(input.actor),
//   action_type: {string},
//   status_before: {string | null},
//   status_after: {string | null},
//   details: {string | null},
//   changed_at: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------