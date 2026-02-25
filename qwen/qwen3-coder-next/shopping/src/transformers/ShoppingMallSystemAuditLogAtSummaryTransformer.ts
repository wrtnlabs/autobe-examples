import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystemAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSystemAuditLogAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_system_audit_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        actor_type: true,
        actor_id: true,
        operation_type: true,
        entity_type: true,
        entity_id: true,
        ip_address: true,
        user_agent: true,
        old_values: true,
        new_values: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.shopping_mall_system_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSystemAuditLog.ISummary> {
    return {
      id: input.id,
      actor_type: input.actor_type,
      actor_id: input.actor_id,
      operation_type: input.operation_type,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      ip_address: input.ip_address,
      description: input.description ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
