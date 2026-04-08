import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheetTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmTimelogTransformer } from "./ErpHrmTimelogTransformer";

export namespace ErpHrmTimesheetTimelogTransformer {
  export type Payload = Prisma.erp_hrm_timesheet_timelogsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        added_at: true,
        timesheet: {
          select: {
            id: true,
          },
        } satisfies Prisma.erp_hrm_timesheetsFindManyArgs,
        timelog: ErpHrmTimelogTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_timesheet_timelogsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimesheetTimelog> {
    return {
      id: input.id,
      addedAt: input.added_at.toISOString(),
      timelog: await ErpHrmTimelogTransformer.transform(input.timelog),
    } satisfies IErpHrmTimesheetTimelog;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmTimesheetTimelogTransformer {
//       export type Payload = Prisma.erp_hrm_timesheet_timelogsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             added_at: true,
//             erp_hrm_timesheet_id: true,
//             timelog: ErpHrmTimelogTransformer.select(),
//           },
//         } satisfies Prisma.erp_hrm_timesheet_timelogsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmTimesheetTimelog> {
//         return {
//   id: {string},
//   addedAt: {string},
//   timelog: await ErpHrmTimelogTransformer.transform(input.timelog),
//         };
//       }
//     }
//--------------------------------------------------------------