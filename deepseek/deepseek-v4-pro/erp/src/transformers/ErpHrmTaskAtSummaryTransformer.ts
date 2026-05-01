import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmEmployeeAtSummaryTransformer } from "./ErpHrmEmployeeAtSummaryTransformer";

export namespace ErpHrmTaskAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_tasksGetPayload<
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
        erp_hrm_parent_task_id: true,
        assignedEmployee: ErpHrmEmployeeAtSummaryTransformer.select(),
        parentTask: undefined,
      },
    } satisfies Prisma.erp_hrm_tasksFindManyArgs;
  }
  export async function transform(
    input: Payload,
    cache: VariadicSingleton<
      Promise<IErpHrmTask.ISummary>,
      [string]
    > = createParentCache(),
  ): Promise<IErpHrmTask.ISummary> {
    return {
      id: input.id,
      title: input.title,
      status: input.status,
      priority: input.priority,
      estimated_hours: input.estimated_hours,
      due_date: input.due_date ? input.due_date.toISOString() : null,
      assignedEmployee: input.assignedEmployee
        ? await ErpHrmEmployeeAtSummaryTransformer.transform(
            input.assignedEmployee,
          )
        : null,
      parentTask: input.erp_hrm_parent_task_id
        ? await cache.get(input.erp_hrm_parent_task_id)
        : null,
      created_at: input.created_at.toISOString(),
    };
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IErpHrmTask.ISummary[]> {
    const cache = createParentCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createParentCache() {
    const cache = new VariadicSingleton(
      async (id: string): Promise<IErpHrmTask.ISummary> => {
        const record = await MyGlobal.prisma.erp_hrm_tasks.findFirstOrThrow({
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
//     export namespace ErpHrmTaskAtSummaryTransformer {
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
//             erp_hrm_project_id: true,
//             erp_hrm_assigned_employee_id: true,
//             erp_hrm_parent_task_id: true,
//             parentTask: undefined, // DO NOT select recursive relation
//             ...
//           },
//         } satisfies Prisma.erp_hrm_tasksFindManyArgs;
//       }
// 
//       export async function transform(
//         input: Payload,
//         cache: VariadicSingleton<Promise<IErpHrmTask.ISummary>, [string]> = createParentCache(),
//       ): Promise<IErpHrmTask.ISummary> {
//         return {
//   id: {string},
//   title: {string},
//   status: {string},
//   priority: {string},
//   estimated_hours: {number | null},
//   due_date: {string | null},
//   assignedEmployee: {IErpHrmEmployee.ISummary | null},
//   parentTask: input.erp_hrm_parent_task_id ? await cache.get(input.erp_hrm_parent_task_id) : null,
//   created_at: {string},
//         };
//       }
// 
//       export async function transformAll(
//         inputs: Payload[],
//       ): Promise<IErpHrmTask.ISummary[]> {
//         const cache = createParentCache();
//         return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
//       }
// 
//       function createParentCache() {
//         const cache = new VariadicSingleton(
//           async (id: string): Promise<IErpHrmTask.ISummary> => {
//             const record =
//               await MyGlobal.prisma.erp_hrm_tasks.findFirstOrThrow({
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