import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import { IHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmEmployeeAtSummaryTransformer } from "./HrmEmployeeAtSummaryTransformer";
import { HrmProjectAtSummaryTransformer } from "./HrmProjectAtSummaryTransformer";
import { HrmTaskAtSummaryTransformer } from "./HrmTaskAtSummaryTransformer";
import { HrmTaskHistoryAtSummaryTransformer } from "./HrmTaskHistoryAtSummaryTransformer";

export namespace HrmTaskTransformer {
  export type Payload = Prisma.hrm_tasksGetPayload<ReturnType<typeof select>>;
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
        project: HrmProjectAtSummaryTransformer.select(),
        assignedEmployee: HrmEmployeeAtSummaryTransformer.select(),
        parentTask: HrmTaskAtSummaryTransformer.select(),
        childTasks: HrmTaskAtSummaryTransformer.select(),
        taskHistories: HrmTaskHistoryAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_tasksFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmTask> {
    return {
      id: input.id,
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      estimated_hours:
        input.estimated_hours !== null ? Number(input.estimated_hours) : null,
      due_date: input.due_date ? toISOStringSafe(input.due_date) : null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      project: await HrmProjectAtSummaryTransformer.transform(input.project),
      assignedEmployee: input.assignedEmployee
        ? await HrmEmployeeAtSummaryTransformer.transform(
            input.assignedEmployee,
          )
        : null,
      parentTask: input.parentTask
        ? await HrmTaskAtSummaryTransformer.transform(input.parentTask)
        : null,
      childTasks: await ArrayUtil.asyncMap(input.childTasks, (task) =>
        HrmTaskAtSummaryTransformer.transform(task),
      ),
      taskHistories: await ArrayUtil.asyncMap(
        input.taskHistories,
        HrmTaskHistoryAtSummaryTransformer.transform,
      ),
    } satisfies IHrmTask;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmTaskTransformer {
//       export type Payload = Prisma.hrm_tasksGetPayload<ReturnType<typeof select>>;
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
//             project: HrmProjectAtSummaryTransformer.select(),
//             assignedEmployee: HrmEmployeeAtSummaryTransformer.select(),
//             parent_task_id: true,
//             taskHistories: HrmTaskHistoryAtSummaryTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.hrm_tasksFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmTask> {
//         return {
//   id: {string},
//   title: {string},
//   description: {string | null},
//   status: {string},
//   priority: {string},
//   estimated_hours: {number | null},
//   due_date: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   project: await HrmProjectAtSummaryTransformer.transform(input.project),
//   assignedEmployee: input.assignedEmployee ? await HrmEmployeeAtSummaryTransformer.transform(input.assignedEmployee) : null,
//   parentTask: {IHrmTask.ISummary | null},
//   childTasks: {Array<IHrmTask.ISummary>},
//   taskHistories: await ArrayUtil.asyncMap(input.taskHistories, HrmTaskHistoryAtSummaryTransformer.transform),
//         };
//       }
//     }
//--------------------------------------------------------------