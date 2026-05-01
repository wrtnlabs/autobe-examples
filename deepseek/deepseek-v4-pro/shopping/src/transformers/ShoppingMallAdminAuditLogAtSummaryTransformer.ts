import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallAdminAtSummaryTransformer } from "./ShoppingMallAdminAtSummaryTransformer";

export namespace ShoppingMallAdminAuditLogAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_admin_audit_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        target_entity_type: true,
        target_entity_id: true,
        old_value: true,
        new_value: true,
        reason: true,
        created_at: true,
        admin: ShoppingMallAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_admin_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAdminAuditLog.ISummary> {
    return {
      id: input.id,
      action_type: input.action_type,
      target_entity_type: input.target_entity_type,
      target_entity_id: input.target_entity_id,
      old_value: input.old_value,
      new_value: input.new_value,
      reason: input.reason,
      admin: await ShoppingMallAdminAtSummaryTransformer.transform(input.admin),
      created_at: input.created_at.toISOString(),
    } satisfies IShoppingMallAdminAuditLog.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallAdminAuditLogAtSummaryTransformer {
//       export type Payload = Prisma.shopping_mall_admin_audit_logsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             action_type: true,
//             target_entity_type: true,
//             target_entity_id: true,
//             old_value: true,
//             new_value: true,
//             reason: true,
//             created_at: true,
//             admin: ShoppingMallAdminAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_admin_audit_logsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallAdminAuditLog.ISummary> {
//         return {
//   id: {string},
//   action_type: {string},
//   target_entity_type: {string},
//   target_entity_id: {string},
//   old_value: {string | null},
//   new_value: {string | null},
//   reason: {string | null},
//   admin: await ShoppingMallAdminAtSummaryTransformer.transform(input.admin),
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------