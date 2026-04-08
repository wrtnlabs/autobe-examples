import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEcommerceMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallSuperAdminAtSummaryTransformer } from "./EcommerceMallSuperAdminAtSummaryTransformer";
import { EcommerceMallSuperAdminAuditLogAtMetadataEntryTransformer } from "./EcommerceMallSuperAdminAuditLogAtMetadataEntryTransformer";

export namespace EcommerceMallSuperAdminAuditLogTransformer {
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
          EcommerceMallSuperAdminAuditLogAtMetadataEntryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_super_admin_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSuperAdminAuditLog> {
    return {
      id: input.id,
      action: input.action,
      targetType: typia.assert<string>(input.target_type),
      targetId: typia.assert<string & tags.Format<"uuid">>(input.target_id),
      ip: input.ip,
      userAgent: input.user_agent,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      superAdmin: await EcommerceMallSuperAdminAtSummaryTransformer.transform(
        input.superAdmin,
      ),
      metadataEntries: await ArrayUtil.asyncMap(
        input.metadataEntries,
        EcommerceMallSuperAdminAuditLogAtMetadataEntryTransformer.transform,
      ),
    } satisfies IEcommerceMallSuperAdminAuditLog;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSuperAdminAuditLogTransformer {
//       export type Payload = Prisma.ecommerce_mall_super_admin_audit_logsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             action: true,
//             targetType: true,
//             targetId: true,
//             ip: true,
//             userAgent: true,
//             createdAt: true,
//             updatedAt: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_super_admin_audit_logsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallSuperAdminAuditLog> {
//         return {
//   id: {string},
//   action: {string},
//   targetType: {string},
//   targetId: {string},
//   ip: {string},
//   userAgent: {string},
//   createdAt: {string},
//   updatedAt: {string},
//   superAdmin: {IEcommerceMallSuperAdmin.ISummary},
//   metadataEntries: {Array<IEcommerceMallSuperAdminAuditLog.IMetadataEntry>},
//         };
//       }
//     }
//--------------------------------------------------------------