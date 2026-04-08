import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { IHrmPlatformTimesheetAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheetAction";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformMemberAtSummaryTransformer } from "./HrmPlatformMemberAtSummaryTransformer";
import { HrmPlatformTimesheetAtSummaryTransformer } from "./HrmPlatformTimesheetAtSummaryTransformer";

export namespace HrmPlatformTimesheetActionTransformer {
  export type Payload = Prisma.hrm_platform_timesheet_actionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action: true,
        notes: true,
        created_at: true,
        updated_at: true,
        timesheet: HrmPlatformTimesheetAtSummaryTransformer.select(),
        actor: HrmPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_timesheet_actionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformTimesheetAction> {
    return {
      id: input.id,
      actor: await HrmPlatformMemberAtSummaryTransformer.transform(input.actor),
      timesheet: await HrmPlatformTimesheetAtSummaryTransformer.transform(
        input.timesheet,
      ),
      action: input.action,
      notes: input.notes,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IHrmPlatformTimesheetAction;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformTimesheetActionTransformer {
//       export type Payload = Prisma.hrm_platform_timesheet_actionsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             action: true,
//             notes: true,
//             created_at: true,
//             updated_at: true,
//             timesheet: HrmPlatformTimesheetAtSummaryTransformer.select(),
//             actor: HrmPlatformMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_platform_timesheet_actionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformTimesheetAction> {
//         return {
//   id: {string},
//   actor: await HrmPlatformMemberAtSummaryTransformer.transform(input.actor),
//   timesheet: await HrmPlatformTimesheetAtSummaryTransformer.transform(input.timesheet),
//   action: {string},
//   notes: {string | null},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------