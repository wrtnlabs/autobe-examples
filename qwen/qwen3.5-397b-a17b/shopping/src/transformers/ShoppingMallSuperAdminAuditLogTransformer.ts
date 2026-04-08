import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { IShoppingMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdminAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallSuperAdminAtSummaryTransformer } from "./ShoppingMallSuperAdminAtSummaryTransformer";

export namespace ShoppingMallSuperAdminAuditLogTransformer {
  export type Payload = Prisma.shopping_mall_super_admin_audit_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        target_model: true,
        target_id: true,
        ip_address: true,
        user_agent: true,
        request_body: true,
        response_status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        superAdmin: ShoppingMallSuperAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_super_admin_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSuperAdminAuditLog> {
    return {
      id: input.id,
      superAdmin: await ShoppingMallSuperAdminAtSummaryTransformer.transform(
        input.superAdmin,
      ),
      action_type: input.action_type,
      target_model: input.target_model,
      target_id: input.target_id ?? undefined,
      ip_address: input.ip_address,
      user_agent: input.user_agent,
      request_body: input.request_body ?? undefined,
      response_status: input.response_status,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IShoppingMallSuperAdminAuditLog;
  }
}
