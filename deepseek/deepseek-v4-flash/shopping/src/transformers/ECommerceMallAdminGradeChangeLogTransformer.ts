import { IECommerceMallAdminGradeChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdminGradeChangeLog";
import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ECommerceMallAdministratorAtSummaryTransformer } from "./ECommerceMallAdministratorAtSummaryTransformer";
import { ECommerceMallSuperAdministratorAtSummaryTransformer } from "./ECommerceMallSuperAdministratorAtSummaryTransformer";

export namespace ECommerceMallAdminGradeChangeLogTransformer {
  export type Payload =
    Prisma.e_commerce_mall_admin_grade_change_logsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        previous_grade: true,
        new_grade: true,
        created_at: true,
        administrator: ECommerceMallAdministratorAtSummaryTransformer.select(),
        actor: ECommerceMallSuperAdministratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.e_commerce_mall_admin_grade_change_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallAdminGradeChangeLog> {
    return {
      id: input.id,
      administrator:
        await ECommerceMallAdministratorAtSummaryTransformer.transform(
          input.administrator,
        ),
      actor:
        await ECommerceMallSuperAdministratorAtSummaryTransformer.transform(
          input.actor,
        ),
      previous_grade: input.previous_grade,
      new_grade: input.new_grade,
      created_at: input.created_at.toISOString(),
    } satisfies IECommerceMallAdminGradeChangeLog;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallAdminGradeChangeLogTransformer {
//       export type Payload = Prisma.e_commerce_mall_admin_grade_change_logsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             previous_grade: true,
//             new_grade: true,
//             created_at: true,
//             administrator: ECommerceMallAdministratorAtSummaryTransformer.select(),
//             actor: ECommerceMallSuperAdministratorAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.e_commerce_mall_admin_grade_change_logsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallAdminGradeChangeLog> {
//         return {
//   id: {string},
//   administrator: await ECommerceMallAdministratorAtSummaryTransformer.transform(input.administrator),
//   actor: await ECommerceMallSuperAdministratorAtSummaryTransformer.transform(input.actor),
//   previous_grade: {string},
//   new_grade: {string},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------