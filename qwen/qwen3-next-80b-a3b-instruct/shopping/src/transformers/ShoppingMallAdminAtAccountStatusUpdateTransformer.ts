import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallAdminAtAccountStatusUpdateTransformer {
  export type Payload = Prisma.shopping_mall_adminGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        shopping_mall_variant_audit_logs: true,
        shopping_mall_audit_logs: true,
        shopping_mall_compliance_records: true,
        shopping_mall_config_history: true,
        shopping_mall_data_exports: true,
        shopping_mall_monitoring_alerts: true,
        shopping_mall_user_flags: true,
      },
    } satisfies Prisma.shopping_mall_adminFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAdmin.IAccountStatusUpdate> {
    return {
      is_active: input.deleted_at === null,
    };
  }
}
