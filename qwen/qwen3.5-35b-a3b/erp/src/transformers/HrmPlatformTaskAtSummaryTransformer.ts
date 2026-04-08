import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformEmployeeAtSummaryTransformer } from "./HrmPlatformEmployeeAtSummaryTransformer";
import { HrmPlatformProjectAtSummaryTransformer } from "./HrmPlatformProjectAtSummaryTransformer";

export namespace HrmPlatformTaskAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_tasksGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        created_at: true,
        due_date: true,
        parent_task_id: true,
        project: HrmPlatformProjectAtSummaryTransformer.select(),
        assignedEmployee: HrmPlatformEmployeeAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_tasksFindManyArgs;
  }
  export async function transform(
    input: Payload,
    parentCache: VariadicSingleton<
      Promise<IHrmPlatformTask.ISummary>,
      [string]
    > = createParentCache(),
  ): Promise<IHrmPlatformTask.ISummary> {
    return {
      id: input.id,
      title: input.title,
      status: input.status,
      priority: input.priority,
      created_at: input.created_at.toISOString(),
      due_date: input.due_date?.toISOString() ?? undefined,
      project: await HrmPlatformProjectAtSummaryTransformer.transform(
        input.project,
      ),
      assignedEmployee: input.assignedEmployee
        ? await HrmPlatformEmployeeAtSummaryTransformer.transform(
            input.assignedEmployee,
          )
        : undefined,
      parentTask: input.parent_task_id
        ? await parentCache.get(input.parent_task_id)
        : undefined,
    } satisfies IHrmPlatformTask.ISummary;
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IHrmPlatformTask.ISummary[]> {
    const parentCache = createParentCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, parentCache));
  }
  function createParentCache() {
    const cache = new VariadicSingleton(
      async (id: string): Promise<IHrmPlatformTask.ISummary> => {
        const record =
          await MyGlobal.prisma.hrm_platform_tasks.findFirstOrThrow({
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
//     export namespace HrmPlatformTaskAtSummaryTransformer {
//       export type Payload = Prisma.hrm_platform_tasksGetPayload<ReturnType<typeof select>>;
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
//             project_id: true,
//             assigned_employee_id: true,
//             parent_task_id: true,
//             parentTask: undefined, // DO NOT select recursive relation
//             ...
//           },
//         } satisfies Prisma.hrm_platform_tasksFindManyArgs;
//       }
// 
//       export async function transform(
//         input: Payload,
//         cache: VariadicSingleton<Promise<IHrmPlatformTask.ISummary>, [string]> = createParentCache(),
//       ): Promise<IHrmPlatformTask.ISummary> {
//         return {
//   id: {string},
//   title: {string},
//   status: {string},
//   priority: {string},
//   created_at: {string},
//   due_date: {string | null},
//   project: {IHrmPlatformProject.ISummary},
//   assignedEmployee: {IHrmPlatformEmployee.ISummary | null},
//   parentTask: input.parent_task_id ? await cache.get(input.parent_task_id) : null,
//         };
//       }
// 
//       export async function transformAll(
//         inputs: Payload[],
//       ): Promise<IHrmPlatformTask.ISummary[]> {
//         const cache = createParentCache();
//         return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
//       }
// 
//       function createParentCache() {
//         const cache = new VariadicSingleton(
//           async (id: string): Promise<IHrmPlatformTask.ISummary> => {
//             const record =
//               await MyGlobal.prisma.hrm_platform_tasks.findFirstOrThrow({
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