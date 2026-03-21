import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import { IErpHrmAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdminAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmAdminAtSummaryTransformer } from "./ErpHrmAdminAtSummaryTransformer";

export namespace ErpHrmAdminAuditLogAtSummaryTransformer {
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
  ): Promise<IErpHrmAdminAuditLog.ISummary> {
    return {
      actionType: input.action_type,
      admin: await ErpHrmAdminAtSummaryTransformer.transform(input.admin),
      createdAt: input.created_at.toISOString(),
      id: input.id,
      ipAddress: input.ip_address ?? null,
      targetEntity: input.target_entity,
      targetId: input.target_id,
    };
  }
}
