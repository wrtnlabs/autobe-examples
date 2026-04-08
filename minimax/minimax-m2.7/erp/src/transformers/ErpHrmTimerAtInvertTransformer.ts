import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmProjectAtSummaryTransformer } from "./ErpHrmProjectAtSummaryTransformer";
import { ErpHrmTaskAtSummaryTransformer } from "./ErpHrmTaskAtSummaryTransformer";

export namespace ErpHrmTimerAtInvertTransformer {
  export type Payload = Prisma.erp_hrm_timersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        started_at: true,
        description: true,
        created_at: true,
        updated_at: true,
        employee: true,
        project: ErpHrmProjectAtSummaryTransformer.select(),
        task: ErpHrmTaskAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_timersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimer.IInvert> {
    const elapsedMs = Date.now() - input.started_at.getTime();
    const elapsed = Math.max(0, Math.floor(elapsedMs / 1000));
    return {
      id: input.id,
      startedAt: input.started_at.toISOString(),
      description: input.description ?? undefined,
      elapsed,
      project: await ErpHrmProjectAtSummaryTransformer.transform(input.project),
      task: input.task
        ? await ErpHrmTaskAtSummaryTransformer.transform(input.task)
        : null,
    } satisfies IErpHrmTimer.IInvert;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmTimerAtInvertTransformer {
//       export type Payload = Prisma.erp_hrm_timersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             started_at: true,
//             description: true,
//             created_at: true,
//             updated_at: true,
//             erp_hrm_employee_id: true,
//             project: ErpHrmProjectAtSummaryTransformer.select(),
//             task: ErpHrmTaskAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.erp_hrm_timersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmTimer.IInvert> {
//         return {
//   id: {string},
//   startedAt: {string},
//   description: {string | null},
//   elapsed: {integer},
//   project: await ErpHrmProjectAtSummaryTransformer.transform(input.project),
//   task: input.task ? await ErpHrmTaskAtSummaryTransformer.transform(input.task) : null,
//         };
//       }
//     }
//--------------------------------------------------------------