import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import { IErpHrmAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdminAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmAdminAtSummaryTransformer } from "./ErpHrmAdminAtSummaryTransformer";

export namespace ErpHrmAdminAuditLogTransformer {
  export type Payload = Prisma.erp_hrm_admin_audit_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        target_entity: true,
        target_id: true,
        metadata: true,
        ip_address: true,
        created_at: true,
        admin: ErpHrmAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_admin_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmAdminAuditLog> {
    return {
      id: input.id,
      action_type: input.action_type,
      target_entity: input.target_entity,
      target_id: input.target_id,
      metadata: input.metadata ?? undefined,
      ip_address: input.ip_address ?? undefined,
      created_at: input.created_at.toISOString(),
      admin: await ErpHrmAdminAtSummaryTransformer.transform(input.admin),
    } satisfies IErpHrmAdminAuditLog;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmAdminAuditLogTransformer {
//       export type Payload = Prisma.erp_hrm_admin_audit_logsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             action_type: true,
//             target_entity: true,
//             target_id: true,
//             metadata: true,
//             ip_address: true,
//             created_at: true,
//             admin: ErpHrmAdminAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.erp_hrm_admin_audit_logsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmAdminAuditLog> {
//         return {
//   id: {string},
//   action_type: {string},
//   target_entity: {string},
//   target_id: {string},
//   metadata: {string | null},
//   ip_address: {string | null},
//   created_at: {string},
//   admin: await ErpHrmAdminAtSummaryTransformer.transform(input.admin),
//         };
//       }
//     }
//--------------------------------------------------------------