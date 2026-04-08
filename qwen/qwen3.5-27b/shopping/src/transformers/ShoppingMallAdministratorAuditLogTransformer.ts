import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorAuditLog";
import { IShoppingMallAdministratorAuditLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorAuditLogDetail";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallAdministratorAtSummaryTransformer } from "./ShoppingMallAdministratorAtSummaryTransformer";
import { ShoppingMallAdministratorAuditLogDetailTransformer } from "./ShoppingMallAdministratorAuditLogDetailTransformer";

export namespace ShoppingMallAdministratorAuditLogTransformer {
  export type Payload = Prisma.shopping_mall_administrator_audit_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        target_type: true,
        target_id: true,
        ip_address: true,
        user_agent: true,
        created_at: true,
        administrator: ShoppingMallAdministratorAtSummaryTransformer.select(),
        auditLogDetails:
          ShoppingMallAdministratorAuditLogDetailTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_administrator_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAdministratorAuditLog> {
    return {
      id: input.id,
      action_type: input.action_type,
      target_type: input.target_type,
      target_id: input.target_id,
      ip_address: input.ip_address,
      user_agent: input.user_agent,
      created_at: input.created_at.toISOString(),
      administrator:
        await ShoppingMallAdministratorAtSummaryTransformer.transform(
          input.administrator,
        ),
      auditLogDetails: await ArrayUtil.asyncMap(
        input.auditLogDetails,
        ShoppingMallAdministratorAuditLogDetailTransformer.transform,
      ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallAdministratorAuditLogTransformer {
//       export type Payload = Prisma.shopping_mall_administrator_audit_logsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             action_type: true,
//             target_type: true,
//             target_id: true,
//             ip_address: true,
//             user_agent: true,
//             created_at: true,
//             administrator: ShoppingMallAdministratorAtSummaryTransformer.select(),
//             auditLogDetails: ShoppingMallAdministratorAuditLogDetailTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_administrator_audit_logsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallAdministratorAuditLog> {
//         return {
//   id: {string},
//   action_type: {string},
//   target_type: {string},
//   target_id: {string | null},
//   ip_address: {string},
//   user_agent: {string | null},
//   created_at: {string},
//   administrator: await ShoppingMallAdministratorAtSummaryTransformer.transform(input.administrator),
//   auditLogDetails: await ArrayUtil.asyncMap(input.auditLogDetails, ShoppingMallAdministratorAuditLogDetailTransformer.transform),
//         };
//       }
//     }
//--------------------------------------------------------------