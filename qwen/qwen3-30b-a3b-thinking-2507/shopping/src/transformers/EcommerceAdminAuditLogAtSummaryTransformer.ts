import { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import { IEcommerceAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceAdminAtSummaryTransformer } from "./EcommerceAdminAtSummaryTransformer";

export namespace EcommerceAdminAuditLogAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_admin_audit_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action: true,
        target_entity: true,
        action_details: true,
        old_state: true,
        new_state: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        admin: EcommerceAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_admin_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceAdminAuditLog.ISummary> {
    return {
      id: input.id,
      action: input.action,
      target_entity: input.target_entity,
      action_details: input.action_details ?? null,
      created_at: input.created_at.toISOString(),
      admin: await EcommerceAdminAtSummaryTransformer.transform(input.admin),
    };
  }
}
