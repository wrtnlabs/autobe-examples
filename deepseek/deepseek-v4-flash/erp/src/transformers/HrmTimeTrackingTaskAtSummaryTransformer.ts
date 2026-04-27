import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingEmployeeAtSummaryTransformer } from "./HrmTimeTrackingEmployeeAtSummaryTransformer";
import { HrmTimeTrackingProjectAtSummaryTransformer } from "./HrmTimeTrackingProjectAtSummaryTransformer";

export namespace HrmTimeTrackingTaskAtSummaryTransformer {
  export type Payload = Prisma.hrm_time_tracking_tasksGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        estimated_hours: true,
        due_date: true,
        created_at: true,
        updated_at: true,
        parent_task_id: true,
        project: HrmTimeTrackingProjectAtSummaryTransformer.select(),
        assignedEmployee: HrmTimeTrackingEmployeeAtSummaryTransformer.select(),
        parentTask: undefined,
      },
    } satisfies Prisma.hrm_time_tracking_tasksFindManyArgs;
  }
  export async function transform(
    input: Payload,
    cache: VariadicSingleton<
      Promise<IHrmTimeTrackingTask.ISummary>,
      [string]
    > = createParentCache(),
  ): Promise<IHrmTimeTrackingTask.ISummary> {
    return {
      id: input.id,
      title: input.title,
      status: input.status,
      priority: input.priority,
      estimated_hours: input.estimated_hours,
      due_date: input.due_date?.toISOString() ?? null,
      project: await HrmTimeTrackingProjectAtSummaryTransformer.transform(
        input.project,
      ),
      assignedEmployee: input.assignedEmployee
        ? await HrmTimeTrackingEmployeeAtSummaryTransformer.transform(
            input.assignedEmployee,
          )
        : null,
      parentTask: input.parent_task_id
        ? await cache.get(input.parent_task_id)
        : null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IHrmTimeTrackingTask.ISummary[]> {
    const cache = createParentCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createParentCache() {
    const cache = new VariadicSingleton(
      async (id: string): Promise<IHrmTimeTrackingTask.ISummary> => {
        const record =
          await MyGlobal.prisma.hrm_time_tracking_tasks.findFirstOrThrow({
            ...select(),
            where: { id },
          });
        return transform(record, cache);
      },
    );
    return cache;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmTimeTrackingTaskAtSummaryTransformer {
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
//             estimated_hours: true,
//             due_date: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             hrm_time_tracking_project_id: true,
//             hrm_time_tracking_employee_id: true,
//             parent_task_id: true,
//             parentTask: undefined, // DO NOT select recursive relation
//             ...
//           },
//         } satisfies Prisma.hrm_time_tracking_tasksFindManyArgs;
//       }
// 
//       export async function transform(
//         input: Payload,
//         cache: VariadicSingleton<Promise<IHrmTimeTrackingTask.ISummary>, [string]> = createParentCache(),
//       ): Promise<IHrmTimeTrackingTask.ISummary> {
//         return {
//   id: {string},
//   title: {string},
//   status: {string},
//   priority: {string},
//   estimated_hours: {number | null},
//   due_date: {string | null},
//   project: {IHrmTimeTrackingProject.ISummary},
//   assignedEmployee: {IHrmTimeTrackingEmployee.ISummary | null},
//   parentTask: input.parent_task_id ? await cache.get(input.parent_task_id) : null,
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
// 
//       export async function transformAll(
//         inputs: Payload[],
//       ): Promise<IHrmTimeTrackingTask.ISummary[]> {
//         const cache = createParentCache();
//         return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
//       }
// 
//       function createParentCache() {
//         const cache = new VariadicSingleton(
//           async (id: string): Promise<IHrmTimeTrackingTask.ISummary> => {
//             const record =
//               await MyGlobal.prisma.hrm_time_tracking_tasks.findFirstOrThrow({
//                 ...select(),
//                 where: { id },
//               });
//             return transform(record, cache);
//           },
//         );
//         return cache;
//       }
//     }
//--------------------------------------------------------------