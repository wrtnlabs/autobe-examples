import { IEcommerceMallSuperAdminAuditLogMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLogMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallSuperAdminAuditLogMetadatumAtSummaryTransformer {
  export type Payload =
    Prisma.ecommerce_mall_super_admin_audit_log_metadataGetPayload<
      ReturnType<typeof select>
    >;
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
        } satisfies Prisma.ecommerce_mall_super_admin_audit_logsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_super_admin_audit_log_metadataFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSuperAdminAuditLogMetadatum.ISummary> {
    return {
      id: input.id,
      key: input.key,
      value: input.value,
      created_at: input.created_at.toISOString(),
    } satisfies IEcommerceMallSuperAdminAuditLogMetadatum.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSuperAdminAuditLogMetadatumAtSummaryTransformer {
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
//       export async function transform(input: Payload): Promise<IEcommerceMallSuperAdminAuditLogMetadatum.ISummary> {
//         return {
//   id: {string},
//   key: {string},
//   value: {string},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------