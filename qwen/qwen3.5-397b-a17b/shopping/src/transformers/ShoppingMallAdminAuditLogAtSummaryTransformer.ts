import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAuditLog";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallAdminAtSummaryTransformer } from "./ShoppingMallAdminAtSummaryTransformer";

export namespace ShoppingMallAdminAuditLogAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_admin_audit_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        target_entity_type: true,
        target_entity_id: true,
        action_details: true,
        ip_address: true,
        user_agent: true,
        created_at: true,
        admin: ShoppingMallAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_admin_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAdminAuditLog.ISummary> {
    return {
      id: input.id,
      actionType: input.action_type,
      targetEntityType: input.target_entity_type,
      targetEntityId: input.target_entity_id,
      actionDetails: input.action_details,
      ipAddress: input.ip_address,
      userAgent: input.user_agent,
      createdAt: input.created_at.toISOString(),
      admin: await ShoppingMallAdminAtSummaryTransformer.transform(input.admin),
    } satisfies IShoppingMallAdminAuditLog.ISummary;
  }
}
