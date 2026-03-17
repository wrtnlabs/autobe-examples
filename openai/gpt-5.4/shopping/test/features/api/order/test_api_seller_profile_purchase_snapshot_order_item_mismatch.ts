import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAttempt";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfilePurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfilePurchaseSnapshot";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_orders_items_seller_profile_purchase_snapshots_create } from "../../../generate/generate_random_shopping_mall_customer_orders_items_seller_profile_purchase_snapshots_create";
import { generate_random_shopping_mall_customer_payment_attempts_create } from "../../../generate/generate_random_shopping_mall_customer_payment_attempts_create";
import { generate_random_shopping_mall_customer_shipping_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_shipping_addresses_create";
import { prepare_random_shopping_mall_payment_attempt } from "../../../prepare/prepare_random_shopping_mall_payment_attempt";
import { prepare_random_shopping_mall_seller_profile_purchase_snapshot } from "../../../prepare/prepare_random_shopping_mall_seller_profile_purchase_snapshot";
import { prepare_random_shopping_mall_shipping_address } from "../../../prepare/prepare_random_shopping_mall_shipping_address";

export async function test_api_seller_profile_purchase_snapshot_order_item_mismatch(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = {
    host: connection.host,
  };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customer);
  const shippingAddress =
    await generate_random_shopping_mall_customer_shipping_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(shippingAddress);
  const firstPaymentAttempt =
    await generate_random_shopping_mall_customer_payment_attempts_create(
      customerConnection,
      {
        body: {
          amount: 10000,
          gateway_provider: `${RandomGenerator.alphabets(8)}-gateway`,
        } satisfies IShoppingMallPaymentAttempt.ICreate,
      },
    );
  typia.assert(firstPaymentAttempt);
  const secondPaymentAttempt =
    await generate_random_shopping_mall_customer_payment_attempts_create(
      customerConnection,
      {
        body: {
          amount: 20000,
          gateway_provider: `${RandomGenerator.alphabets(8)}-gateway`,
        } satisfies IShoppingMallPaymentAttempt.ICreate,
      },
    );
  typia.assert(secondPaymentAttempt);
  await TestValidator.httpError(
    "seller profile purchase snapshot rejects mismatched or nonexistent order-item path",
    [400, 404, 409, 422],
    async () => {
      await generate_random_shopping_mall_customer_orders_items_seller_profile_purchase_snapshots_create(
        customerConnection,
        {
          params: {
            orderId: typia.random<string & tags.Format<"uuid">>(),
            itemId: typia.random<string & tags.Format<"uuid">>(),
          },
          body: {
            shop_name: RandomGenerator.name(),
            logo_uri: typia.random<string & tags.Format<"uri">>(),
          } satisfies IShoppingMallSellerProfilePurchaseSnapshot.ICreate,
        },
      );
    },
  );
}
