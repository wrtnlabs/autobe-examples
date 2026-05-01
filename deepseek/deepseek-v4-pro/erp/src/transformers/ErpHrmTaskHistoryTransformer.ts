import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmMemberAtSummaryTransformer } from "./ErpHrmMemberAtSummaryTransformer";
import { ErpHrmTaskAtSummaryTransformer } from "./ErpHrmTaskAtSummaryTransformer";

export namespace ErpHrmTaskHistoryTransformer {
  export type Payload = Prisma.erp_hrm_task_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        old_status: true,
        new_status: true,
        created_at: true,
        task: ErpHrmTaskAtSummaryTransformer.select(),
        changedByMember: ErpHrmMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_task_historiesFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmTaskHistory> {
    return {
      id: input.id,
      task: await ErpHrmTaskAtSummaryTransformer.transform(input.task),
      changedByMember: await ErpHrmMemberAtSummaryTransformer.transform(
        input.changedByMember,
      ),
      old_status: input.old_status,
      new_status: input.new_status,
      created_at: input.created_at.toISOString(),
    } satisfies IErpHrmTaskHistory;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmTaskHistoryTransformer {
//       export type Payload = Prisma.erp_hrm_task_historiesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             old_status: true,
//             new_status: true,
//             created_at: true,
//             task: ErpHrmTaskAtSummaryTransformer.select(),
//             changedByMember: ErpHrmMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.erp_hrm_task_historiesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmTaskHistory> {
//         return {
//   id: {string},
//   task: await ErpHrmTaskAtSummaryTransformer.transform(input.task),
//   changedByMember: await ErpHrmMemberAtSummaryTransformer.transform(input.changedByMember),
//   old_status: {string},
//   new_status: {string},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------