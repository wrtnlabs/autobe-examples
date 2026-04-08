import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export namespace HrmTaskAtSummaryTransformer {
  export type Payload = Prisma.hrm_tasksGetPayload<ReturnType<typeof select>>;
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
        project: HrmProjectAtSummaryTransformer.select(),
        assignedEmployee: HrmEmployeeAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_tasksFindManyArgs;
  }
  export async function transform(
    input: Payload,
    cache: VariadicSingleton<
      Promise<IHrmTask.ISummary>,
      [string]
    > = createParentCache(),
  ): Promise<IHrmTask.ISummary> {
    return {
      id: input.id,
      title: input.title,
      status: input.status,
      priority: input.priority,
      project: await HrmProjectAtSummaryTransformer.transform(input.project),
      assignedEmployee: input.assignedEmployee
        ? await HrmEmployeeAtSummaryTransformer.transform(
            input.assignedEmployee,
          )
        : null,
      parentTask: input.parent_task_id
        ? await cache.get(input.parent_task_id)
        : null,
      dueDate: input.due_date ? toISOStringSafe(input.due_date) : null,
      estimatedHours: input.estimated_hours ?? null,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
    } satisfies IHrmTask.ISummary;
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IHrmTask.ISummary[]> {
    const cache = createParentCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createParentCache() {
    const cache = new VariadicSingleton(
      async (id: string): Promise<IHrmTask.ISummary> => {
        const record = await MyGlobal.prisma.hrm_tasks.findFirstOrThrow({
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
//     export namespace HrmTaskAtSummaryTransformer {
//       export type Payload = Prisma.hrm_tasksGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             title: true,
//             status: true,
//             priority: true,
//             dueDate: true,
//             estimatedHours: true,
//             createdAt: true,
//             updatedAt: true,
//             parentTask_id: true,
//             parentTask: undefined, // DO NOT select recursive relation
//             ...
//           },
//         } satisfies Prisma.hrm_tasksFindManyArgs;
//       }
// 
//       export async function transform(
//         input: Payload,
//         cache: VariadicSingleton<Promise<IHrmTask.ISummary>, [string]> = createParentCache(),
//       ): Promise<IHrmTask.ISummary> {
//         return {
//   id: {string},
//   title: {string},
//   status: {string},
//   priority: {string},
//   project: {IHrmProject.ISummary},
//   assignedEmployee: {IHrmEmployee.ISummary | null},
//   parentTask: input.parentTask_id ? await cache.get(input.parentTask_id) : null,
//   dueDate: {string | null},
//   estimatedHours: {number | null},
//   createdAt: {string},
//   updatedAt: {string},
//         };
//       }
// 
//       export async function transformAll(
//         inputs: Payload[],
//       ): Promise<IHrmTask.ISummary[]> {
//         const cache = createParentCache();
//         return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
//       }
// 
//       function createParentCache() {
//         const cache = new VariadicSingleton(
//           async (id: string): Promise<IHrmTask.ISummary> => {
//             const record =
//               await MyGlobal.prisma.hrm_tasks.findFirstOrThrow({
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