import { IEcommerceMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallSuperAdminAuditLogAtMetadataEntryTransformer {
  // 1. Payload type first
  export type Payload =
    Prisma.ecommerce_mall_super_admin_audit_log_metadataGetPayload<
      ReturnType<typeof select>
    >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        key: true,
        value: true,
        created_at: true,
        auditLog: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_super_admin_audit_logsFindFirstArgs,
      },
    } satisfies Prisma.ecommerce_mall_super_admin_audit_log_metadataFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSuperAdminAuditLog.IMetadataEntry> {
    return {
      id: input.id,
      key: input.key,
      value: input.value,
      createdAt: input.created_at.toISOString(),
    } satisfies IEcommerceMallSuperAdminAuditLog.IMetadataEntry;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSuperAdminAuditLogAtMetadataEntryTransformer {
//       export type Payload = Prisma.ecommerce_mall_super_admin_audit_log_metadataGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             key: true,
//             value: true,
//             created_at: true,
//             ecommerce_mall_super_admin_audit_log_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_super_admin_audit_log_metadataFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallSuperAdminAuditLog.IMetadataEntry> {
//         return {
//   id: {string},
//   key: {string},
//   value: {string},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------