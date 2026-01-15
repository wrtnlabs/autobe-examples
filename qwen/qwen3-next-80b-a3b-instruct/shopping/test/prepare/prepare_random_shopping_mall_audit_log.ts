import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuditLog";
export function prepare_random_shopping_mall_audit_log(
  input?: DeepPartial<IShoppingMallAuditLog.ICreate>,
): IShoppingMallAuditLog.ICreate {
  return {
    action:
      input?.action ??
      RandomGenerator.pick([
        "user_login",
        "user_logout",
        "config_update",
        "product_create",
        "product_update",
        "product_delete",
        "order_create",
        "order_cancel",
        "order_complete",
        "admin_deactivate",
        "admin_activate",
        "payment_success",
        "payment_failed",
        "review_post",
        "review_delete",
      ] as const),
    target_entity_type:
      input?.target_entity_type ??
      RandomGenerator.pick([
        "user",
        "product",
        "order",
        "configuration",
        "payment",
        "review",
      ] as const),
  };
}
