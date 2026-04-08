import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmPlatformTaskTransformer {
  export type Payload = Prisma.hrm_platform_tasksGetPayload<
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
        project: {
          select: {
            id: true,
          },
        },
        parentTask: true,
        assignedEmployee: true,
        childrenTasks: true,
        histories: true,
        timers: true,
        timelogs: true,
      },
    } satisfies Prisma.hrm_platform_tasksFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmPlatformTask> {
    return {
      search: null,
      project_id: input.project.id,
      status: input.status,
      priority: input.priority,
      page: null,
      limit: null,
    } satisfies IHrmPlatformTask;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformTaskTransformer {
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
//             parent_task_id: true,
//             assigned_employee_id: true,
//           },
//         } satisfies Prisma.hrm_platform_tasksFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformTask> {
//         return {
//   search: {string | null},
//   project_id: {string | null},
//   status: {string | null},
//   priority: {string | null},
//   page: {integer | null},
//   limit: {integer | null},
//         };
//       }
//     }
//--------------------------------------------------------------