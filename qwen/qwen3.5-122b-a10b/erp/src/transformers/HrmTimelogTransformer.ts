import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmEmployeeAtSummaryTransformer } from "./HrmEmployeeAtSummaryTransformer";
import { HrmProjectAtSummaryTransformer } from "./HrmProjectAtSummaryTransformer";
import { HrmTaskAtSummaryTransformer } from "./HrmTaskAtSummaryTransformer";

export namespace HrmTimelogTransformer {
  export type Payload = Prisma.hrm_timelogsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        date: true,
        duration_minutes: true,
        description: true,
        billable: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employee: HrmEmployeeAtSummaryTransformer.select(),
        project: HrmProjectAtSummaryTransformer.select(),
        task: HrmTaskAtSummaryTransformer.select(),
        timelogTimesheets: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_timesheet_timelogsFindManyArgs,
      },
    } satisfies Prisma.hrm_timelogsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmTimelog> {
    return {
      id: input.id,
      date: input.date.toISOString(),
      duration_minutes: input.duration_minutes,
      description: input.description ?? null,
      billable: input.billable,
      employee: await HrmEmployeeAtSummaryTransformer.transform(input.employee),
      project: await HrmProjectAtSummaryTransformer.transform(input.project),
      task: input.task
        ? await HrmTaskAtSummaryTransformer.transform(input.task)
        : null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IHrmTimelog;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmTimelogTransformer {
//       export type Payload = Prisma.hrm_timelogsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             date: true,
//             duration_minutes: true,
//             description: true,
//             billable: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             employee: HrmEmployeeAtSummaryTransformer.select(),
//             project: HrmProjectAtSummaryTransformer.select(),
//             task: HrmTaskAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_timelogsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmTimelog> {
//         return {
//   id: {string},
//   date: {string},
//   duration_minutes: {integer},
//   description: {string | null},
//   billable: {boolean},
//   employee: await HrmEmployeeAtSummaryTransformer.transform(input.employee),
//   project: await HrmProjectAtSummaryTransformer.transform(input.project),
//   task: input.task ? await HrmTaskAtSummaryTransformer.transform(input.task) : null,
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------