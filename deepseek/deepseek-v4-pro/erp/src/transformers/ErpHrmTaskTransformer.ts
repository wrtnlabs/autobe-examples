import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
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
import { ErpHrmEmployeeAtSummaryTransformer } from "./ErpHrmEmployeeAtSummaryTransformer";
import { ErpHrmProjectAtSummaryTransformer } from "./ErpHrmProjectAtSummaryTransformer";
import { ErpHrmTaskAtSummaryTransformer } from "./ErpHrmTaskAtSummaryTransformer";
import { ErpHrmTaskHistoryAtSummaryTransformer } from "./ErpHrmTaskHistoryAtSummaryTransformer";

export namespace ErpHrmTaskTransformer {
  export type Payload = Prisma.erp_hrm_tasksGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        estimated_hours: true,
        due_date: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        project: ErpHrmProjectAtSummaryTransformer.select(),
        assignedEmployee: ErpHrmEmployeeAtSummaryTransformer.select(),
        parentTask: ErpHrmTaskAtSummaryTransformer.select(),
        childTasks: ErpHrmTaskAtSummaryTransformer.select(),
        statusHistories: ErpHrmTaskHistoryAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_tasksFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmTask> {
    return {
      id: input.id,
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      estimated_hours: input.estimated_hours,
      due_date: input.due_date ? toISOStringSafe(input.due_date) : null,
      project: await ErpHrmProjectAtSummaryTransformer.transform(input.project),
      assignedEmployee: input.assignedEmployee
        ? await ErpHrmEmployeeAtSummaryTransformer.transform(
            input.assignedEmployee,
          )
        : null,
      parentTask: input.parentTask
        ? await ErpHrmTaskAtSummaryTransformer.transform(input.parentTask)
        : null,
      childTasks: await ArrayUtil.asyncMap(input.childTasks, (child) =>
        ErpHrmTaskAtSummaryTransformer.transform(child),
      ),
      statusHistories: await ArrayUtil.asyncMap(
        input.statusHistories,
        (history) => ErpHrmTaskHistoryAtSummaryTransformer.transform(history),
      ),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    } satisfies IErpHrmTask;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmTaskTransformer {
//       export type Payload = Prisma.erp_hrm_tasksGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             title: true,
//             description: true,
//             status: true,
//             priority: true,
//             estimated_hours: true,
//             due_date: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             ...
//           },
//         } satisfies Prisma.erp_hrm_tasksFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmTask> {
//         return {
//   id: {string},
//   title: {string},
//   description: {string | null},
//   status: {string},
//   priority: {string},
//   estimated_hours: {number | null},
//   due_date: {string | null},
//   project: {IErpHrmProject.ISummary},
//   assignedEmployee: {IErpHrmEmployee.ISummary | null},
//   parentTask: {IErpHrmTask.ISummary | null},
//   childTasks: {Array<IErpHrmTask.ISummary>},
//   statusHistories: {Array<IErpHrmTaskHistory.ISummary>},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------