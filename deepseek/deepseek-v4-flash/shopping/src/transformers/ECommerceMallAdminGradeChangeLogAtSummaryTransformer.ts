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

export namespace ECommerceMallAdminGradeChangeLogAtSummaryTransformer {
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
  ): Promise<IECommerceMallAdminGradeChangeLog.ISummary> {
    return {
      id: input.id,
      administrator:
        await ECommerceMallAdministratorAtSummaryTransformer.transform(
          input.administrator,
        ),
      superAdministrator:
        await ECommerceMallSuperAdministratorAtSummaryTransformer.transform(
          input.actor,
        ),
      previousGrade: input.previous_grade,
      newGrade: input.new_grade,
      createdAt: input.created_at.toISOString(),
    } satisfies IECommerceMallAdminGradeChangeLog.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallAdminGradeChangeLogAtSummaryTransformer {
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
//       export async function transform(input: Payload): Promise<IECommerceMallAdminGradeChangeLog.ISummary> {
//         return {
//   id: {string},
//   administrator: await ECommerceMallAdministratorAtSummaryTransformer.transform(input.administrator),
//   superAdministrator: await ECommerceMallSuperAdministratorAtSummaryTransformer.transform(input.actor),
//   previousGrade: {string},
//   newGrade: {string},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------