import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

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
      action: input.action,
      resource_type: input.resource_type,
      resource_id: input.resource_id,
      details: input.details,
      ip_address: input.ip_address,
      user_agent: input.user_agent,
      created_at: input.created_at.toISOString(),
      admin: await EcommerceMallAdminAtSummaryTransformer.transform(
        input.admin,
      ),
    };
  }
}
