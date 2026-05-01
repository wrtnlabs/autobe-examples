import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmProjectMemberTransformer } from "./ErpHrmProjectMemberTransformer";
import { ErpHrmTaskAtSummaryTransformer } from "./ErpHrmTaskAtSummaryTransformer";

export namespace ErpHrmProjectTransformer {
  export type Payload = Prisma.erp_hrm_projectsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        organization_id: true,
        name: true,
        description: true,
        color_code: true,
        status: true,
        budget_hours: true,
        start_date: true,
        end_date: true,
        created_at: true,
        updated_at: true,
        _count: {
          select: {
            timelogs: true,
            timers: true,
          },
        },
        projectMembers: ErpHrmProjectMemberTransformer.select(),
        tasks: ErpHrmTaskAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_projectsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmProject> {
    return {
      id: input.id,
      organization_id: input.organization_id,
      name: input.name,
      description: input.description ?? null,
      color_code: input.color_code,
      status: input.status,
      budget_hours: input.budget_hours ?? null,
      start_date: input.start_date ? toISOStringSafe(input.start_date) : null,
      end_date: input.end_date ? toISOStringSafe(input.end_date) : null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      projectMembers: await ArrayUtil.asyncMap(
        input.projectMembers,
        ErpHrmProjectMemberTransformer.transform,
      ),
      tasks: await ArrayUtil.asyncMap(input.tasks, (task) =>
        ErpHrmTaskAtSummaryTransformer.transform(task),
      ),
      timelogs_count: input._count.timelogs,
      timers_count: input._count.timers,
    } satisfies IErpHrmProject;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmProjectTransformer {
//       export type Payload = Prisma.erp_hrm_projectsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             organization_id: true,
//             name: true,
//             description: true,
//             color_code: true,
//             status: true,
//             budget_hours: true,
//             start_date: true,
//             end_date: true,
//             created_at: true,
//             updated_at: true,
//             timelogs_count: true,
//             timers_count: true,
//             ...
//           },
//         } satisfies Prisma.erp_hrm_projectsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmProject> {
//         return {
//   id: {string},
//   organization_id: {string},
//   name: {string},
//   description: {string | null},
//   color_code: {string},
//   status: {string},
//   budget_hours: {number | null},
//   start_date: {string | null},
//   end_date: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   projectMembers: {Array<IErpHrmProjectMember>},
//   tasks: {Array<IErpHrmTask.ISummary>},
//   timelogs_count: {integer},
//   timers_count: {integer},
//         };
//       }
//     }
//--------------------------------------------------------------