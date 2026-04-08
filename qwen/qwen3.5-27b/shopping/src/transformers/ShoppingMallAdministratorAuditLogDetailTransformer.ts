import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministratorAuditLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorAuditLogDetail";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallAdministratorAuditLogDetailTransformer {
  export type Payload =
    Prisma.shopping_mall_administrator_audit_log_detailsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        field_name: true,
        old_value: true,
        new_value: true,
        created_at: true,
        auditLog: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_administrator_audit_log_detailsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAdministratorAuditLogDetail> {
    return {
      id: input.id,
      field_name: input.field_name,
      old_value: input.old_value ?? null,
      new_value: input.new_value ?? null,
      created_at: input.created_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallAdministratorAuditLogDetailTransformer {
//       export type Payload = Prisma.shopping_mall_administrator_audit_log_detailsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             field_name: true,
//             old_value: true,
//             new_value: true,
//             created_at: true,
//             shopping_mall_administrator_audit_log_id: true,
//           },
//         } satisfies Prisma.shopping_mall_administrator_audit_log_detailsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallAdministratorAuditLogDetail> {
//         return {
//   id: {string},
//   field_name: {string},
//   old_value: {string | null},
//   new_value: {string | null},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------