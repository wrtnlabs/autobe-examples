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

export namespace ECommerceMallAdministratorAuditLogTransformer {
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
  ): Promise<IECommerceMallAdministratorAuditLog> {
    return {
      id: input.id,
      administrator:
        await ECommerceMallAdministratorAtSummaryTransformer.transform(
          input.administrator,
        ),
      action_type: input.action_type,
      target_type: input.target_type,
      target_id: input.target_id,
      reason: input.reason,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IECommerceMallAdministratorAuditLog;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallAdministratorAuditLogTransformer {
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
//       export async function transform(input: Payload): Promise<IECommerceMallAdministratorAuditLog> {
//         return {
//   id: {string},
//   administrator: await ECommerceMallAdministratorAtSummaryTransformer.transform(input.administrator),
//   action_type: {string},
//   target_type: {string},
//   target_id: {string},
//   reason: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------