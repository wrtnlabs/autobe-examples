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

export async function test_api_product_purchase_snapshot_historical_values_preserved(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const paymentAttempt =
    await generate_random_shopping_mall_customer_payment_attempts_create(
      customerConnection,
      {
        body: {
          amount: 100,
          gateway_provider: `gateway-${RandomGenerator.alphabets(6)}`,
        },
      },
    );
  typia.assert(paymentAttempt);
  TestValidator.equals(
    "payment attempt belongs to authenticated customer",
    paymentAttempt.customer.id,
    authorized.id,
  );
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const expectedOptionValues = [
    {
      option_name: "Color",
      option_value: `Vintage-${RandomGenerator.alphabets(6)}`,
      display_order: 1 satisfies number as number & tags.Type<"int32">,
    },
    {
      option_name: "Size",
      option_value: `Archived-${RandomGenerator.alphabets(4)}`,
      display_order: 2 satisfies number as number & tags.Type<"int32">,
    },
  ] satisfies IShoppingMallProductPurchaseSnapshotOptionValue.ICreate[];
  const snapshotBody = {
    product_name: `Purchased-${RandomGenerator.name(2)}`,
    product_description: RandomGenerator.content({ paragraphs: 2 }),
    sku_code: `SNAP-${RandomGenerator.alphaNumeric(10)}`,
    unit_price: 250,
    optionValues: expectedOptionValues,
  } satisfies IShoppingMallProductPurchaseSnapshot.ICreate;
  const createdSnapshot =
    await generate_random_shopping_mall_customer_orders_items_product_purchase_snapshots_create(
      customerConnection,
      {
        params: {
          orderId,
          itemId,
        },
        body: snapshotBody,
      },
    );
  typia.assert(createdSnapshot);
  const snapshot =
    await api.functional.shoppingMall.customer.orders.items.productPurchaseSnapshots.getByOrderidAndItemidAndProductpurchasesnapshotid(
      customerConnection,
      {
        orderId,
        itemId,
        productPurchaseSnapshotId: createdSnapshot.id,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot id preserved",
    snapshot.id,
    createdSnapshot.id,
  );
  TestValidator.equals(
    "snapshot order item id preserved",
    snapshot.orderItem.id,
    createdSnapshot.orderItem.id,
  );
  TestValidator.equals(
    "snapshot product name matches request snapshot",
    snapshot.product_name,
    snapshotBody.product_name,
  );
  TestValidator.equals(
    "snapshot product description matches request snapshot",
    snapshot.product_description,
    snapshotBody.product_description,
  );
  TestValidator.equals(
    "snapshot sku code matches request snapshot",
    snapshot.sku_code,
    snapshotBody.sku_code,
  );
  TestValidator.equals(
    "snapshot unit price matches request snapshot",
    snapshot.unit_price,
    snapshotBody.unit_price,
  );
  TestValidator.equals(
    "created snapshot product name matches request snapshot",
    createdSnapshot.product_name,
    snapshotBody.product_name,
  );
  TestValidator.equals(
    "created snapshot product description matches request snapshot",
    createdSnapshot.product_description,
    snapshotBody.product_description,
  );
  TestValidator.equals(
    "created snapshot sku code matches request snapshot",
    createdSnapshot.sku_code,
    snapshotBody.sku_code,
  );
  TestValidator.equals(
    "created snapshot unit price matches request snapshot",
    createdSnapshot.unit_price,
    snapshotBody.unit_price,
  );
  TestValidator.equals(
    "snapshot option values count preserved",
    snapshot.optionValues.length,
    expectedOptionValues.length,
  );
  TestValidator.equals(
    "snapshot option values preserve historical ordering and contents",
    snapshot.optionValues.map((value) => ({
      option_name: value.option_name,
      option_value: value.option_value,
      display_order: value.display_order,
    })),
    expectedOptionValues.map((value) => ({
      option_name: value.option_name,
      option_value: value.option_value,
      display_order: value.display_order,
    })),
  );
  TestValidator.predicate(
    "retrieved snapshot uses explicit purchase-time historical values",
    snapshot.product_name === snapshotBody.product_name &&
      snapshot.product_description === snapshotBody.product_description &&
      snapshot.sku_code === snapshotBody.sku_code &&
      snapshot.unit_price === snapshotBody.unit_price,
  );
}
