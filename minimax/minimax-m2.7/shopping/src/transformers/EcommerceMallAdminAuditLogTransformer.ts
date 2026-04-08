import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallAdminAtSummaryTransformer } from "./EcommerceMallAdminAtSummaryTransformer";

export namespace EcommerceMallAdminAuditLogTransformer {
  export type Payload = Prisma.ecommerce_mall_admin_audit_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action: true,
        resource_type: true,
        resource_id: true,
        details: true,
        ip_address: true,
        user_agent: true,
        created_at: true,
        admin: EcommerceMallAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_admin_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAdminAuditLog> {
    return {
      id: input.id,
      admin: await EcommerceMallAdminAtSummaryTransformer.transform(
        input.admin,
      ),
      action: input.action,
      resourceType: input.resource_type,
      resourceId: input.resource_id,
      details: input.details,
      ipAddress: input.ip_address,
      userAgent: input.user_agent,
      createdAt: input.created_at.toISOString(),
    } satisfies IEcommerceMallAdminAuditLog;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallAdminAuditLogTransformer {
//       export type Payload = Prisma.ecommerce_mall_admin_audit_logsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             action: true,
//             resource_type: true,
//             resource_id: true,
//             details: true,
//             ip_address: true,
//             user_agent: true,
//             created_at: true,
//             admin: EcommerceMallAdminAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_admin_audit_logsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallAdminAuditLog> {
//         return {
//   id: {string},
//   admin: await EcommerceMallAdminAtSummaryTransformer.transform(input.admin),
//   action: {string},
//   resourceType: {string},
//   resourceId: {string},
//   details: {string | null},
//   ipAddress: {string},
//   userAgent: {string | null},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------