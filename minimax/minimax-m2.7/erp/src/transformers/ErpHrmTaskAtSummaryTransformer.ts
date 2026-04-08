import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { ArrayUtil } from "@nestia/e2e";
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
        // DTO fields
        id: true,
        title: true,
        status: true,
        priority: true,
        due_date: true,
        created_at: true,
        assignee: ErpHrmEmployeeAtSummaryTransformer.select(),
        // Non-DTO fields (schema completeness)
        description: true,
        estimated_hours: true,
        updated_at: true,
        project: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_projectsFindManyArgs,
        parent: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_tasksFindManyArgs,
        subtasks: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_tasksFindManyArgs,
        taskHistories: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_task_historiesFindManyArgs,
        timelogs: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_timelogsFindManyArgs,
        timers: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_timersFindManyArgs,
      },
    } satisfies Prisma.erp_hrm_tasksFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTask.ISummary> {
    return {
      id: input.id,
      title: input.title,
      status: input.status,
      priority: input.priority,
      due_date: input.due_date?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      assignee: input.assignee
        ? await ErpHrmEmployeeAtSummaryTransformer.transform(input.assignee)
        : null,
    } satisfies IErpHrmTask.ISummary;
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
//             erp_hrm_project_id: true,
//             assignee: ErpHrmEmployeeAtSummaryTransformer.select(),
//             parent_id: true,
//           },
//         } satisfies Prisma.erp_hrm_tasksFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmTask.ISummary> {
//         return {
//   assignee: input.assignee ? await ErpHrmEmployeeAtSummaryTransformer.transform(input.assignee) : null,
//   created_at: {string},
//   due_date: {string | null},
//   id: {string},
//   priority: {string},
//   status: {string},
//   title: {string},
//         };
//       }
//     }
//--------------------------------------------------------------