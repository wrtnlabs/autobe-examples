import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmEmployeeAtSummaryTransformer } from "./ErpHrmEmployeeAtSummaryTransformer";
import { ErpHrmProjectAtSummaryTransformer } from "./ErpHrmProjectAtSummaryTransformer";
import { ErpHrmTaskAtSummaryTransformer } from "./ErpHrmTaskAtSummaryTransformer";

export namespace ErpHrmTimerAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_timersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        start_timestamp: true,
        description: true,
        created_at: true,
        updated_at: true,
        employee: ErpHrmEmployeeAtSummaryTransformer.select(),
        project: ErpHrmProjectAtSummaryTransformer.select(),
        task: ErpHrmTaskAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_timersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimer.ISummary> {
    return {
      id: input.id,
      employee: await ErpHrmEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      project: await ErpHrmProjectAtSummaryTransformer.transform(input.project),
      task: input.task
        ? await ErpHrmTaskAtSummaryTransformer.transform(input.task)
        : null,
      start_timestamp: input.start_timestamp.toISOString(),
      description: input.description,
      created_at: input.created_at.toISOString(),
    } satisfies IErpHrmTimer.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmTimerAtSummaryTransformer {
//       export type Payload = Prisma.erp_hrm_timersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             start_timestamp: true,
//             description: true,
//             created_at: true,
//             updated_at: true,
//             employee: ErpHrmEmployeeAtSummaryTransformer.select(),
//             project: ErpHrmProjectAtSummaryTransformer.select(),
//             task: ErpHrmTaskAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.erp_hrm_timersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmTimer.ISummary> {
//         return {
//   id: {string},
//   employee: await ErpHrmEmployeeAtSummaryTransformer.transform(input.employee),
//   project: await ErpHrmProjectAtSummaryTransformer.transform(input.project),
//   task: input.task ? await ErpHrmTaskAtSummaryTransformer.transform(input.task) : null,
//   start_timestamp: {string},
//   description: {string | null},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------