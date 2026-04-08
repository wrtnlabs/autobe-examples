import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmActiveTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmActiveTimer";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmEmployeeAtSummaryTransformer } from "./HrmEmployeeAtSummaryTransformer";
import { HrmProjectAtSummaryTransformer } from "./HrmProjectAtSummaryTransformer";
import { HrmTaskAtSummaryTransformer } from "./HrmTaskAtSummaryTransformer";

export namespace HrmActiveTimerTransformer {
  export type Payload = Prisma.hrm_active_timersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        description: true,
        start_timestamp: true,
        created_at: true,
        updated_at: true,
        employee: HrmEmployeeAtSummaryTransformer.select(),
        project: HrmProjectAtSummaryTransformer.select(),
        task: HrmTaskAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_active_timersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmActiveTimer> {
    return {
      id: input.id,
      description: input.description,
      employee: await HrmEmployeeAtSummaryTransformer.transform(input.employee),
      project: await HrmProjectAtSummaryTransformer.transform(input.project),
      start_timestamp: input.start_timestamp.toISOString(),
      task: input.task
        ? await HrmTaskAtSummaryTransformer.transform(input.task)
        : null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IHrmActiveTimer;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmActiveTimerTransformer {
//       export type Payload = Prisma.hrm_active_timersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             description: true,
//             start_timestamp: true,
//             created_at: true,
//             updated_at: true,
//             employee: HrmEmployeeAtSummaryTransformer.select(),
//             project: HrmProjectAtSummaryTransformer.select(),
//             task: HrmTaskAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_active_timersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmActiveTimer> {
//         return {
//   id: {string},
//   description: {string | null},
//   employee: await HrmEmployeeAtSummaryTransformer.transform(input.employee),
//   project: await HrmProjectAtSummaryTransformer.transform(input.project),
//   start_timestamp: {string},
//   task: input.task ? await HrmTaskAtSummaryTransformer.transform(input.task) : null,
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------