import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAttempt";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductPurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshot";
import type { IShoppingMallProductPurchaseSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshotOptionValue";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_orders_items_product_purchase_snapshots_create } from "../../../generate/generate_random_shopping_mall_customer_orders_items_product_purchase_snapshots_create";
import { generate_random_shopping_mall_customer_payment_attempts_create } from "../../../generate/generate_random_shopping_mall_customer_payment_attempts_create";
import { prepare_random_shopping_mall_payment_attempt } from "../../../prepare/prepare_random_shopping_mall_payment_attempt";
import { prepare_random_shopping_mall_product_purchase_snapshot } from "../../../prepare/prepare_random_shopping_mall_product_purchase_snapshot";
import { prepare_random_shopping_mall_product_purchase_snapshot_option_value } from "../../../prepare/prepare_random_shopping_mall_product_purchase_snapshot_option_value";

export async function test_api_product_purchase_snapshot_parent_chain_not_found(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const paymentAttempt =
    await generate_random_shopping_mall_customer_payment_attempts_create(
      customerConnection,
      {
        body: {
          amount: 100,
          gateway_provider: RandomGenerator.alphabets(8),
        } satisfies IShoppingMallPaymentAttempt.ICreate,
      },
    );
  typia.assert(paymentAttempt);
  const seedOrderId = typia.random<string & tags.Format<"uuid">>();
  const seedItemId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await generate_random_shopping_mall_customer_orders_items_product_purchase_snapshots_create(
      customerConnection,
      {
        params: {
          orderId: seedOrderId,
          itemId: seedItemId,
        },
        body: {
          product_name: RandomGenerator.name(2),
          product_description: RandomGenerator.paragraph({ sentences: 3 }),
          sku_code: RandomGenerator.alphaNumeric(12),
          unit_price: 100,
        } satisfies IShoppingMallProductPurchaseSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  const actualItemId = snapshot.orderItem.id;
  const actualOrderId = snapshot.orderItem.shipment?.order.id;
  const resolvedOrderId = actualOrderId ?? seedOrderId;
  const mismatchedItemId = typia.random<string & tags.Format<"uuid">>();
  TestValidator.notEquals(
    "mismatched item id must differ from actual item id",
    mismatchedItemId,
    actualItemId,
  );
  await TestValidator.httpError(
    "get product purchase snapshot rejects mismatched parent chain",
    404,
    async () => {
      await api.functional.shoppingMall.customer.orders.items.productPurchaseSnapshots.getByOrderidAndItemidAndProductpurchasesnapshotid(
        customerConnection,
        {
          orderId: resolvedOrderId,
          itemId: mismatchedItemId,
          productPurchaseSnapshotId: snapshot.id,
        },
      );
    },
  );
}
