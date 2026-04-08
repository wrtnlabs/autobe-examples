import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEcommerceMallSuperAdminAuditLogMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLogMetadatum";
import { IEcommerceMallSuperAdminAuditLogSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLogSummary";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallSuperAdminAtSummaryTransformer } from "./EcommerceMallSuperAdminAtSummaryTransformer";
import { EcommerceMallSuperAdminAuditLogMetadatumAtSummaryTransformer } from "./EcommerceMallSuperAdminAuditLogMetadatumAtSummaryTransformer";

export namespace EcommerceMallSuperAdminAuditLogSummaryTransformer {
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
  ): Promise<IEcommerceMallSuperAdminAuditLogSummary> {
    return {
      id: input.id,
      action: input.action,
      targetType: input.target_type,
      targetId: input.target_id,
      ip: input.ip,
      userAgent: input.user_agent,
      createdAt: input.created_at.toISOString(),
      superAdmin: await EcommerceMallSuperAdminAtSummaryTransformer.transform(
        input.superAdmin,
      ),
      metadata: await ArrayUtil.asyncMap(
        input.metadataEntries,
        EcommerceMallSuperAdminAuditLogMetadatumAtSummaryTransformer.transform,
      ),
    } satisfies IEcommerceMallSuperAdminAuditLogSummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSuperAdminAuditLogSummaryTransformer {
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
//       export async function transform(input: Payload): Promise<IEcommerceMallSuperAdminAuditLogSummary> {
//         return {
//   id: {string},
//   action: {string},
//   targetType: {string | null},
//   targetId: {string | null},
//   ip: {string},
//   userAgent: {string},
//   createdAt: {string},
//   superAdmin: await EcommerceMallSuperAdminAtSummaryTransformer.transform(input.superAdmin),
//   metadata: await ArrayUtil.asyncMap(input.metadataEntries, EcommerceMallSuperAdminAuditLogMetadatumAtSummaryTransformer.transform),
//         };
//       }
//     }
//--------------------------------------------------------------