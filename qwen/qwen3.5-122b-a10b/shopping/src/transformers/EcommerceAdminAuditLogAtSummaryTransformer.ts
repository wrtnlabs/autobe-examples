import { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import { IEcommerceAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
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
        action_type: true,
        target_entity: true,
        target_id: true,
        previous_state: true,
        new_state: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        ecommerceAdmin: EcommerceAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_admin_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceAdminAuditLog.ISummary> {
    return {
      id: input.id,
      action_type: input.action_type,
      target_entity: input.target_entity,
      target_id: input.target_id ?? undefined,
      admin: await EcommerceAdminAtSummaryTransformer.transform(
        input.ecommerceAdmin,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
    } satisfies IEcommerceAdminAuditLog.ISummary;
  }
}
