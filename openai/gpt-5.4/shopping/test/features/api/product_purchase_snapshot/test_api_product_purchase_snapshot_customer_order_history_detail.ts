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

export async function test_api_product_purchase_snapshot_customer_order_history_detail(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = {
    host: connection.host,
    simulate: connection.simulate,
  };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/signup" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/landing" satisfies string &
        tags.Format<"uri">,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const paymentAttempt =
    await generate_random_shopping_mall_customer_payment_attempts_create(
      customerConnection,
      {
        body: {
          amount: 100,
          gateway_provider: "test-gateway",
        },
      },
    );
  typia.assert(paymentAttempt);
  const optionValues = [
    {
      option_name: "Color",
      option_value: RandomGenerator.name(1),
      display_order: typia.random<number & tags.Type<"int32">>(),
    },
    {
      option_name: "Size",
      option_value: RandomGenerator.name(1),
      display_order: typia.random<number & tags.Type<"int32">>(),
    },
  ] satisfies IShoppingMallProductPurchaseSnapshotOptionValue.ICreate[];
  const snapshotCreateBody = {
    product_name: RandomGenerator.name(2),
    product_description: RandomGenerator.content({ paragraphs: 2 }),
    sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    unit_price: 100,
    optionValues,
  } satisfies IShoppingMallProductPurchaseSnapshot.ICreate;
  const createdSnapshot =
    await generate_random_shopping_mall_customer_orders_items_product_purchase_snapshots_create(
      customerConnection,
      {
        params: {
          orderId: typia.random<string & tags.Format<"uuid">>(),
          itemId: typia.random<string & tags.Format<"uuid">>(),
        },
        body: snapshotCreateBody,
      },
    );
  typia.assert(createdSnapshot);
  TestValidator.predicate(
    "created snapshot exposes shipment order for detail path",
    createdSnapshot.orderItem.shipment !== null,
  );
  const orderId = createdSnapshot.orderItem.shipment!.order.id;
  const itemId = createdSnapshot.orderItem.id;
  const output: IShoppingMallProductPurchaseSnapshot =
    await api.functional.shoppingMall.customer.orders.items.productPurchaseSnapshots.getByOrderidAndItemidAndProductpurchasesnapshotid(
      customerConnection,
      {
        orderId,
        itemId,
        productPurchaseSnapshotId: createdSnapshot.id,
      },
    );
  typia.assert(output);
  TestValidator.equals("snapshot id matches", output.id, createdSnapshot.id);
  TestValidator.equals(
    "product name preserved from request",
    output.product_name,
    snapshotCreateBody.product_name,
  );
  TestValidator.equals(
    "product name matches created snapshot",
    output.product_name,
    createdSnapshot.product_name,
  );
  TestValidator.equals(
    "product description preserved from request",
    output.product_description,
    snapshotCreateBody.product_description,
  );
  TestValidator.equals(
    "product description matches created snapshot",
    output.product_description,
    createdSnapshot.product_description,
  );
  TestValidator.equals(
    "sku code preserved from request",
    output.sku_code,
    snapshotCreateBody.sku_code,
  );
  TestValidator.equals(
    "sku code matches created snapshot",
    output.sku_code,
    createdSnapshot.sku_code,
  );
  TestValidator.equals(
    "unit price preserved from request",
    output.unit_price,
    snapshotCreateBody.unit_price,
  );
  TestValidator.equals(
    "unit price matches created snapshot",
    output.unit_price,
    createdSnapshot.unit_price,
  );
  TestValidator.equals(
    "order item id matches",
    output.orderItem.id,
    createdSnapshot.orderItem.id,
  );
  TestValidator.equals(
    "order item quantity matches",
    output.orderItem.quantity,
    createdSnapshot.orderItem.quantity,
  );
  TestValidator.equals(
    "order item unit price matches",
    output.orderItem.unit_price,
    createdSnapshot.orderItem.unit_price,
  );
  TestValidator.equals(
    "order item status matches",
    output.orderItem.status,
    createdSnapshot.orderItem.status,
  );
  TestValidator.equals(
    "option value count preserved",
    output.optionValues.length,
    createdSnapshot.optionValues.length,
  );
  for (const [index, optionValue] of createdSnapshot.optionValues.entries()) {
    const found = output.optionValues[index];
    TestValidator.equals(
      `option name preserved ${index}`,
      found?.option_name,
      optionValue.option_name,
    );
    TestValidator.equals(
      `option value preserved ${index}`,
      found?.option_value,
      optionValue.option_value,
    );
    TestValidator.equals(
      `option display order preserved ${index}`,
      found?.display_order,
      optionValue.display_order,
    );
  }
  TestValidator.equals(
    "shipment order id matches request order id",
    output.orderItem.shipment!.order.id,
    orderId,
  );
  if (createdSnapshot.product !== null && output.product !== null) {
    TestValidator.equals(
      "traceability product id matches",
      output.product.id,
      createdSnapshot.product.id,
    );
  }
  if (
    createdSnapshot.productVariant !== null &&
    output.productVariant !== null
  ) {
    TestValidator.equals(
      "traceability product variant id matches",
      output.productVariant.id,
      createdSnapshot.productVariant.id,
    );
  }
}
