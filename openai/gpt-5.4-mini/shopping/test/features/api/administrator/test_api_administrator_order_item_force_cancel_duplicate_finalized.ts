import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_order_item_force_cancel_duplicate_finalized(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const firstResult =
    await api.functional.shoppingMall.administrator.order_items.force_cancel.forceCancel(
      adminConnection,
      {
        orderItemId,
      },
    );
  typia.assert(firstResult);
  const secondResult =
    await api.functional.shoppingMall.administrator.order_items.force_cancel.forceCancel(
      adminConnection,
      {
        orderItemId,
      },
    );
  typia.assert(secondResult);
  TestValidator.equals(
    "order item status should remain cancelled after duplicate force-cancel",
    secondResult.status,
    "cancelled",
  );
  TestValidator.equals(
    "duplicate force-cancel should not change the final item state",
    secondResult.status,
    firstResult.status,
  );
  TestValidator.equals(
    "duplicate force-cancel should not change the item cancellation timestamp",
    secondResult.cancelled_at,
    firstResult.cancelled_at,
  );
  TestValidator.equals(
    "duplicate force-cancel should not change the item refund timestamp",
    secondResult.refunded_at,
    firstResult.refunded_at,
  );
}
