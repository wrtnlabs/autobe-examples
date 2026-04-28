import { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import { IEcommercePlatformAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommercePlatformAdminAtSummaryTransformer } from "./EcommercePlatformAdminAtSummaryTransformer";

export namespace EcommercePlatformAdminAuditLogAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_platform_admin_audit_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        target_type: true,
        target_id: true,
        action: true,
        reason: true,
        created_at: true,
        admin: EcommercePlatformAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_platform_admin_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformAdminAuditLog.ISummary> {
    return {
      id: input.id,
      target_type: input.target_type,
      target_id: input.target_id,
      action: input.action,
      reason: input.reason ?? null,
      created_at: input.created_at.toISOString(),
      admin: await EcommercePlatformAdminAtSummaryTransformer.transform(
        input.admin,
      ),
    } satisfies IEcommercePlatformAdminAuditLog.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformAdminAuditLogAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_platform_admin_audit_logsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             target_type: true,
//             target_id: true,
//             action: true,
//             reason: true,
//             created_at: true,
//             admin: EcommercePlatformAdminAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_platform_admin_audit_logsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformAdminAuditLog.ISummary> {
//         return {
//   id: {string},
//   target_type: {string},
//   target_id: {string},
//   action: {string},
//   reason: {string | null},
//   created_at: {string},
//   admin: await EcommercePlatformAdminAtSummaryTransformer.transform(input.admin),
//         };
//       }
//     }
//--------------------------------------------------------------