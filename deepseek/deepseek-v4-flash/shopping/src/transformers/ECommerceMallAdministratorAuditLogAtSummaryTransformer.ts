import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import { IECommerceMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministratorAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ECommerceMallAdministratorAtSummaryTransformer } from "./ECommerceMallAdministratorAtSummaryTransformer";

export namespace ECommerceMallAdministratorAuditLogAtSummaryTransformer {
  export type Payload =
    Prisma.e_commerce_mall_administrator_audit_logsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        target_type: true,
        target_id: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        administrator: ECommerceMallAdministratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.e_commerce_mall_administrator_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallAdministratorAuditLog.ISummary> {
    return {
      id: input.id,
      action_type: input.action_type,
      target_type: input.target_type,
      target_id: input.target_id,
      reason: input.reason,
      administrator:
        await ECommerceMallAdministratorAtSummaryTransformer.transform(
          input.administrator,
        ),
      created_at: input.created_at.toISOString(),
    } satisfies IECommerceMallAdministratorAuditLog.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallAdministratorAuditLogAtSummaryTransformer {
//       export type Payload = Prisma.e_commerce_mall_administrator_audit_logsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             action_type: true,
//             target_type: true,
//             target_id: true,
//             reason: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             administrator: ECommerceMallAdministratorAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.e_commerce_mall_administrator_audit_logsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallAdministratorAuditLog.ISummary> {
//         return {
//   id: {string},
//   action_type: {string},
//   target_type: {string},
//   target_id: {string},
//   reason: {string | null},
//   administrator: await ECommerceMallAdministratorAtSummaryTransformer.transform(input.administrator),
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------