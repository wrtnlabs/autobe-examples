import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingEmployeeAtSummaryTransformer } from "./HrmTimeTrackingEmployeeAtSummaryTransformer";
import { HrmTimeTrackingProjectAtSummaryTransformer } from "./HrmTimeTrackingProjectAtSummaryTransformer";
import { HrmTimeTrackingTaskAtSummaryTransformer } from "./HrmTimeTrackingTaskAtSummaryTransformer";
import { HrmTimeTrackingTaskHistoryTransformer } from "./HrmTimeTrackingTaskHistoryTransformer";

export namespace HrmTimeTrackingTaskTransformer {
  export type Payload = Prisma.hrm_time_tracking_tasksGetPayload<
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
        project: HrmTimeTrackingProjectAtSummaryTransformer.select(),
        assignedEmployee: HrmTimeTrackingEmployeeAtSummaryTransformer.select(),
        parentTask: HrmTimeTrackingTaskAtSummaryTransformer.select(),
        subtasks: HrmTimeTrackingTaskAtSummaryTransformer.select(),
        taskHistories: HrmTimeTrackingTaskHistoryTransformer.select(),
      },
    } satisfies Prisma.hrm_time_tracking_tasksFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingTask> {
    return {
      id: input.id,
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      estimatedHours: input.estimated_hours,
      dueDate: input.due_date !== null ? toISOStringSafe(input.due_date) : null,
      project: await HrmTimeTrackingProjectAtSummaryTransformer.transform(
        input.project,
      ),
      assignedEmployee: input.assignedEmployee
        ? await HrmTimeTrackingEmployeeAtSummaryTransformer.transform(
            input.assignedEmployee,
          )
        : null,
      parent: input.parentTask
        ? await HrmTimeTrackingTaskAtSummaryTransformer.transform(
            input.parentTask,
          )
        : null,
      subtasks: await ArrayUtil.asyncMap(input.subtasks, async (elem) =>
        HrmTimeTrackingTaskAtSummaryTransformer.transform(elem),
      ),
      taskHistories: await ArrayUtil.asyncMap(
        input.taskHistories,
        HrmTimeTrackingTaskHistoryTransformer.transform,
      ),
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt:
        input.deleted_at !== null ? toISOStringSafe(input.deleted_at) : null,
    } satisfies IHrmTimeTrackingTask;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmTimeTrackingTaskTransformer {
//       export type Payload = Prisma.hrm_time_tracking_tasksGetPayload<ReturnType<typeof select>>;
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
//             estimatedHours: true,
//             dueDate: true,
//             createdAt: true,
//             updatedAt: true,
//             deletedAt: true,
//             ...
//           },
//         } satisfies Prisma.hrm_time_tracking_tasksFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmTimeTrackingTask> {
//         return {
//   id: {string},
//   title: {string},
//   description: {string | null},
//   status: {string},
//   priority: {string},
//   estimatedHours: {number | null},
//   dueDate: {string | null},
//   project: {IHrmTimeTrackingProject.ISummary},
//   assignedEmployee: {IHrmTimeTrackingEmployee.ISummary | null},
//   parent: {IHrmTimeTrackingTask.ISummary | null},
//   subtasks: {Array<IHrmTimeTrackingTask.ISummary>},
//   taskHistories: {Array<IHrmTimeTrackingTaskHistory>},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------