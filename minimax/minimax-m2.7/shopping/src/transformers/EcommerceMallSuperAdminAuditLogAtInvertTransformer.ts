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
import { EcommerceMallSuperAdminAtSummaryTransformer } from "./EcommerceMallSuperAdminAtSummaryTransformer";
import { EcommerceMallSuperAdminAuditLogMetadatumAtSummaryTransformer } from "./EcommerceMallSuperAdminAuditLogMetadatumAtSummaryTransformer";

export namespace EcommerceMallSuperAdminAuditLogAtInvertTransformer {
  export type Payload = Prisma.ecommerce_mall_super_admin_audit_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action: true,
        target_type: true,
        target_id: true,
        ip: true,
        user_agent: true,
        created_at: true,
        updated_at: true,
        superAdmin: EcommerceMallSuperAdminAtSummaryTransformer.select(),
        metadataEntries:
          EcommerceMallSuperAdminAuditLogMetadatumAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_super_admin_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSuperAdminAuditLog.IInvert> {
    return {
      id: input.id,
      action: input.action,
      ip: input.ip,
      userAgent: input.user_agent,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      targetType: input.target_type ?? undefined,
      targetId: input.target_id ?? undefined,
      superAdmin: await EcommerceMallSuperAdminAtSummaryTransformer.transform(
        input.superAdmin,
      ),
      metadataEntries: await ArrayUtil.asyncMap(
        input.metadataEntries,
        EcommerceMallSuperAdminAuditLogMetadatumAtSummaryTransformer.transform,
      ),
    } satisfies IEcommerceMallSuperAdminAuditLog.IInvert;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSuperAdminAuditLogAtInvertTransformer {
//       export type Payload = Prisma.ecommerce_mall_super_admin_audit_logsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             action: true,
//             target_type: true,
//             target_id: true,
//             ip: true,
//             user_agent: true,
//             created_at: true,
//             updated_at: true,
//             superAdmin: EcommerceMallSuperAdminAtSummaryTransformer.select(),
//             metadataEntries: EcommerceMallSuperAdminAuditLogMetadatumAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_super_admin_audit_logsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallSuperAdminAuditLog.IInvert> {
//         return {
//   action: {string},
//   createdAt: {string},
//   id: {string},
//   ip: {string},
//   metadataEntries: await ArrayUtil.asyncMap(input.metadataEntries, EcommerceMallSuperAdminAuditLogMetadatumAtSummaryTransformer.transform),
//   superAdmin: await EcommerceMallSuperAdminAtSummaryTransformer.transform(input.superAdmin),
//   targetId: {string},
//   targetType: {string},
//   updatedAt: {string},
//   userAgent: {string},
//         };
//       }
//     }
//--------------------------------------------------------------