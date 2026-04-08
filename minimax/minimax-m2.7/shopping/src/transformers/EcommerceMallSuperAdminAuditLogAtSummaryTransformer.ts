import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEcommerceMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallSuperAdminAtSummaryTransformer } from "./EcommerceMallSuperAdminAtSummaryTransformer";

export namespace EcommerceMallSuperAdminAuditLogAtSummaryTransformer {
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
        metadataEntries: {
          select: {
            id: true,
            key: true,
            value: true,
          },
        } satisfies Prisma.ecommerce_mall_super_admin_audit_log_metadataFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_super_admin_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSuperAdminAuditLog.ISummary> {
    return {
      action: input.action,
      created_at: input.created_at.toISOString(),
      id: input.id,
      ip: input.ip,
      superAdmin: input.superAdmin
        ? await EcommerceMallSuperAdminAtSummaryTransformer.transform(
            input.superAdmin,
          )
        : undefined,
      target_id: input.target_id,
      target_type: input.target_type,
      user_agent: input.user_agent,
    } satisfies IEcommerceMallSuperAdminAuditLog.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSuperAdminAuditLogAtSummaryTransformer {
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
//           },
//         } satisfies Prisma.ecommerce_mall_super_admin_audit_logsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallSuperAdminAuditLog.ISummary> {
//         return {
//   action: {string},
//   created_at: {string},
//   id: {string},
//   ip: {string},
//   superAdmin: await EcommerceMallSuperAdminAtSummaryTransformer.transform(input.superAdmin),
//   target_id: {string | null},
//   target_type: {string | null},
//   user_agent: {string},
//         };
//       }
//     }
//--------------------------------------------------------------