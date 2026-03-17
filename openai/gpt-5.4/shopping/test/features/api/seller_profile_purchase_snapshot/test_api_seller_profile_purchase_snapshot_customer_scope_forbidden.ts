import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfilePurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfilePurchaseSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfilePurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfilePurchaseSnapshot";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_orders_items_seller_profile_purchase_snapshots_create } from "../../../generate/generate_random_shopping_mall_customer_orders_items_seller_profile_purchase_snapshots_create";
import { prepare_random_shopping_mall_seller_profile_purchase_snapshot } from "../../../prepare/prepare_random_shopping_mall_seller_profile_purchase_snapshot";

export async function test_api_seller_profile_purchase_snapshot_customer_scope_forbidden(
  connection: api.IConnection,
): Promise<void> {
  const attackerConnection: api.IConnection = { host: connection.host };
  const attacker = await authorize_customer_join(attackerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(attacker);
  const requestBody = {
    page: 1 satisfies number as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sort: "-created_at",
  } satisfies IShoppingMallSellerProfilePurchaseSnapshot.IRequest;
  await TestValidator.httpError(
    "customer cannot access another customer's preserved seller profile snapshots",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.customer.orders.items.sellerProfilePurchaseSnapshots.index(
        attackerConnection,
        {
          orderId: typia.random<string & tags.Format<"uuid">>(),
          itemId: typia.random<string & tags.Format<"uuid">>(),
          body: requestBody,
        },
      );
    },
  );
}
