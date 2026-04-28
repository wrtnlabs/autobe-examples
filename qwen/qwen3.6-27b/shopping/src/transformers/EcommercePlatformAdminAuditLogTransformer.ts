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

export namespace EcommercePlatformAdminAuditLogTransformer {
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
  ): Promise<IEcommercePlatformAdminAuditLog> {
    return {
      id: input.id,
      admin: await EcommercePlatformAdminAtSummaryTransformer.transform(
        input.admin,
      ),
      targetType: input.target_type,
      targetId: input.target_id,
      action: input.action,
      reason: input.reason ?? null,
      createdAt: input.created_at.toISOString(),
    } satisfies IEcommercePlatformAdminAuditLog;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformAdminAuditLogTransformer {
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
//       export async function transform(input: Payload): Promise<IEcommercePlatformAdminAuditLog> {
//         return {
//   id: {string},
//   admin: await EcommercePlatformAdminAtSummaryTransformer.transform(input.admin),
//   targetType: {string},
//   targetId: {string},
//   action: {string},
//   reason: {string | null},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------