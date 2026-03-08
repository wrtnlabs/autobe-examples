import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallAdminAtSummaryTransformer } from "./EcommerceMallAdminAtSummaryTransformer";

export namespace EcommerceMallCustomerAtAdminAuditLogTransformer {
  export type Payload = Prisma.ecommerce_mall_admin_audit_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        target_entity_type: true,
        target_entity_id: true,
        changes: true,
        previous_values: true,
        new_values: true,
        request_id: true,
        ip_address: true,
        user_agent: true,
        created_at: true,
        updated_at: true,
        admin: EcommerceMallAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_admin_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCustomer.IAdminAuditLog> {
    return {
      id: input.id,
      admin: await EcommerceMallAdminAtSummaryTransformer.transform(
        input.admin,
      ),
      action_type: input.action_type,
      target_entity_type: input.target_entity_type,
      target_entity_id: input.target_entity_id ?? null,
      changes: input.changes ? JSON.parse(input.changes) : null,
      previous_values: input.previous_values
        ? JSON.parse(input.previous_values)
        : null,
      new_values: input.new_values ? JSON.parse(input.new_values) : null,
      request_id: input.request_id ?? null,
      ip_address: input.ip_address ?? null,
      user_agent: input.user_agent ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IEcommerceMallCustomer.IAdminAuditLog;
  }
}
