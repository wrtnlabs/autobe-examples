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
        ip: true,
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
      action: input.action,
      resourceType: input.resource_type ?? null,
      resourceId: input.resource_id ?? null,
      details: input.details ?? null,
      ip: input.ip ?? null,
      userAgent: input.user_agent ?? null,
      createdAt: input.created_at.toISOString(),
      admin: await EcommerceMallAdminAtSummaryTransformer.transform(
        input.admin,
      ),
    };
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
//             ip: true,
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
//   action: {string},
//   resourceType: {string | null},
//   resourceId: {string | null},
//   details: {string | null},
//   ip: {string | null},
//   userAgent: {string | null},
//   createdAt: {string},
//   admin: await EcommerceMallAdminAtSummaryTransformer.transform(input.admin),
//         };
//       }
//     }
//--------------------------------------------------------------