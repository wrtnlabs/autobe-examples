import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmEmployeeAtSummaryTransformer } from "./ErpHrmEmployeeAtSummaryTransformer";
import { ErpHrmProjectAtSummaryTransformer } from "./ErpHrmProjectAtSummaryTransformer";
import { ErpHrmTaskAtSummaryTransformer } from "./ErpHrmTaskAtSummaryTransformer";
import { ErpHrmTimesheetAtSummaryTransformer } from "./ErpHrmTimesheetAtSummaryTransformer";

export namespace ErpHrmTimelogTransformer {
  export type Payload = Prisma.erp_hrm_timelogsGetPayload<
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
        employee: ErpHrmEmployeeAtSummaryTransformer.select(),
        project: ErpHrmProjectAtSummaryTransformer.select(),
        task: ErpHrmTaskAtSummaryTransformer.select(),
        timesheet: ErpHrmTimesheetAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_timelogsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmTimelog> {
    return {
      id: input.id,
      date: input.date.toISOString(),
      duration_minutes: input.duration_minutes,
      description: input.description ?? null,
      billable: input.billable,
      employee: await ErpHrmEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      project: await ErpHrmProjectAtSummaryTransformer.transform(input.project),
      task: input.task
        ? await ErpHrmTaskAtSummaryTransformer.transform(input.task)
        : null,
      timesheet: input.timesheet
        ? await ErpHrmTimesheetAtSummaryTransformer.transform(input.timesheet)
        : null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IErpHrmTimelog;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmTimelogTransformer {
//       export type Payload = Prisma.erp_hrm_timelogsGetPayload<ReturnType<typeof select>>;
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
//             employee: ErpHrmEmployeeAtSummaryTransformer.select(),
//             project: ErpHrmProjectAtSummaryTransformer.select(),
//             task: ErpHrmTaskAtSummaryTransformer.select(),
//             timesheet: ErpHrmTimesheetAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.erp_hrm_timelogsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmTimelog> {
//         return {
//   id: {string},
//   date: {string},
//   duration_minutes: {integer},
//   description: {string | null},
//   billable: {boolean},
//   employee: await ErpHrmEmployeeAtSummaryTransformer.transform(input.employee),
//   project: await ErpHrmProjectAtSummaryTransformer.transform(input.project),
//   task: input.task ? await ErpHrmTaskAtSummaryTransformer.transform(input.task) : null,
//   timesheet: input.timesheet ? await ErpHrmTimesheetAtSummaryTransformer.transform(input.timesheet) : null,
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------