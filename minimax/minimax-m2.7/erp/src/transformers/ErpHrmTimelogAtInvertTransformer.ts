import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmEmployeeAtSummaryTransformer } from "./ErpHrmEmployeeAtSummaryTransformer";
import { ErpHrmProjectAtSummaryTransformer } from "./ErpHrmProjectAtSummaryTransformer";
import { ErpHrmTaskAtSummaryTransformer } from "./ErpHrmTaskAtSummaryTransformer";
import { ErpHrmTimesheetAtSummaryTransformer } from "./ErpHrmTimesheetAtSummaryTransformer";

export namespace ErpHrmTimelogAtInvertTransformer {
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
        employee: ErpHrmEmployeeAtSummaryTransformer.select(),
        project: ErpHrmProjectAtSummaryTransformer.select(),
        task: ErpHrmTaskAtSummaryTransformer.select(),
        timelogTimesheets: {
          select: {
            timesheet: ErpHrmTimesheetAtSummaryTransformer.select(),
          },
        },
      },
    } satisfies Prisma.erp_hrm_timelogsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimelog.IInvert> {
    return {
      id: input.id,
      date: toISOStringSafe(input.date),
      durationMinutes: input.duration_minutes,
      description: input.description ?? undefined,
      billable: input.billable,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      employee: await ErpHrmEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      project: await ErpHrmProjectAtSummaryTransformer.transform(input.project),
      task: input.task
        ? await ErpHrmTaskAtSummaryTransformer.transform(input.task)
        : null,
      timesheet: await ErpHrmTimesheetAtSummaryTransformer.transform(
        input.timelogTimesheets[0].timesheet,
      ),
    } satisfies IErpHrmTimelog.IInvert;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmTimelogAtInvertTransformer {
//       export type Payload = Prisma.erp_hrm_timelogsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             date: true,
//             durationMinutes: true,
//             description: true,
//             billable: true,
//             createdAt: true,
//             updatedAt: true,
//             ...
//           },
//         } satisfies Prisma.erp_hrm_timelogsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmTimelog.IInvert> {
//         return {
//   id: {string},
//   date: {string},
//   durationMinutes: {integer},
//   description: {string | null},
//   billable: {boolean},
//   createdAt: {string},
//   updatedAt: {string},
//   employee: {IErpHrmEmployee.ISummary},
//   project: {IErpHrmProject.ISummary},
//   task: {IErpHrmTask.ISummary | null},
//   timesheet: {IErpHrmTimesheet.ISummary},
//         };
//       }
//     }
//--------------------------------------------------------------