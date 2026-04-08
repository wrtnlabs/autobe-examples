import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEcommerceMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLog";
import { IEcommerceMallSuperAdminAuditLogMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLogMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallSuperAdminAuditLogAtSummaryTransformer } from "./EcommerceMallSuperAdminAuditLogAtSummaryTransformer";

export namespace EcommerceMallSuperAdminAuditLogMetadatumTransformer {
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
        auditLog: EcommerceMallSuperAdminAuditLogAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_super_admin_audit_log_metadataFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSuperAdminAuditLogMetadatum> {
    return {
      id: input.id,
      key: input.key,
      value: input.value,
      createdAt: input.created_at.toISOString(),
      auditLog:
        await EcommerceMallSuperAdminAuditLogAtSummaryTransformer.transform(
          input.auditLog,
        ),
    } satisfies IEcommerceMallSuperAdminAuditLogMetadatum;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSuperAdminAuditLogMetadatumTransformer {
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
//             auditLog: EcommerceMallSuperAdminAuditLogAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_super_admin_audit_log_metadataFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallSuperAdminAuditLogMetadatum> {
//         return {
//   id: {string},
//   key: {string},
//   value: {string},
//   createdAt: {string},
//   auditLog: await EcommerceMallSuperAdminAuditLogAtSummaryTransformer.transform(input.auditLog),
//         };
//       }
//     }
//--------------------------------------------------------------