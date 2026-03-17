import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEcommerceMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallSuperAdminTransformer } from "./EcommerceMallSuperAdminTransformer";

export namespace EcommerceMallSuperAdminAuditLogTransformer {
  export function select() {
    return {
      select: {
        id: true,
        superAdmin: EcommerceMallSuperAdminTransformer.select(),
        action_type: true,
        description: true,
        target_type: true,
        target_id: true,
        ip_address: true,
        user_agent: true,
        created_at: true,
      },
    } satisfies Prisma.ecommerce_mall_super_admin_audit_logsFindManyArgs;
  }
  export type Payload = Prisma.ecommerce_mall_super_admin_audit_logsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSuperAdminAuditLog> {
    return {
      id: input.id,
      superAdmin: await EcommerceMallSuperAdminTransformer.transform(
        input.superAdmin,
      ),
      actionType: input.action_type,
      description: input.description,
      targetType: input.target_type ?? null,
      targetId: input.target_id ?? null,
      ipAddress: input.ip_address,
      userAgent: input.user_agent,
      createdAt: input.created_at.toISOString(),
    };
  }
}
