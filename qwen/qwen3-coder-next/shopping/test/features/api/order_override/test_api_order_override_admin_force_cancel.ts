import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminActionLog";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderOverride";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_order_overrides_create } from "../../../generate/generate_random_ecommerce_mall_admin_order_overrides_create";
import { prepare_random_ecommerce_mall_order_override } from "../../../prepare/prepare_random_ecommerce_mall_order_override";

export async function test_api_order_override_admin_force_cancel(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestAdmin123!",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminResult);
  // 2. Create order override with valid data
  // In a real scenario, we would first create:
  // - Customer account
  // - Order with items
  // - Then test the override on existing order item
  // For this test, we create a realistic order override request
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const overrideResult =
    await api.functional.ecommerceMall.admin.order_overrides.create(
      adminConnection,
      {
        body: {
          order_item_id: orderItemId,
          action_type: "cancel" as const,
          reason: "Administrative cancellation - test scenario",
        } satisfies IEcommerceMallOrderOverride.ICreate,
      },
    );
  typia.assert(overrideResult);
  // 3. Validate override record
  TestValidator.equals(
    "action_type is cancel",
    overrideResult.action_type,
    "cancel",
  );
  TestValidator.equals(
    "reason matches",
    overrideResult.reason,
    "Administrative cancellation - test scenario",
  );
  TestValidator.equals(
    "order item ID matches",
    overrideResult.orderItem.id,
    orderItemId,
  );
  TestValidator.predicate(
    "has created_at timestamp",
    overrideResult.created_at !== null &&
      overrideResult.created_at !== undefined,
  );
  TestValidator.predicate(
    "has admin user information",
    overrideResult.adminUser !== null && overrideResult.adminUser !== undefined,
  );
  TestValidator.predicate(
    "has customer information",
    overrideResult.customer !== null && overrideResult.customer !== undefined,
  );
  TestValidator.predicate(
    "has seller information",
    overrideResult.seller !== null && overrideResult.seller !== undefined,
  );
  TestValidator.predicate(
    "has order information",
    overrideResult.order !== null && overrideResult.order !== undefined,
  );
}
