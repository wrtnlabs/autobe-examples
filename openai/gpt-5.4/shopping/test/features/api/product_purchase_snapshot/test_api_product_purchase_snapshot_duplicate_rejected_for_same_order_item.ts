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

export async function test_api_product_purchase_snapshot_duplicate_rejected_for_same_order_item(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
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
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    product_name: RandomGenerator.name(),
    product_description: RandomGenerator.content({ paragraphs: 2 }),
    sku_code: RandomGenerator.alphaNumeric(12),
    unit_price: 100,
    optionValues: [
      {
        option_name: "Color",
        option_value: RandomGenerator.name(1),
        display_order: 1 satisfies number as number,
      },
      {
        option_name: "Size",
        option_value: RandomGenerator.name(1),
        display_order: 2 satisfies number as number,
      },
    ] satisfies IShoppingMallProductPurchaseSnapshotOptionValue.ICreate[],
  } satisfies IShoppingMallProductPurchaseSnapshot.ICreate;
  const first =
    await generate_random_shopping_mall_customer_orders_items_product_purchase_snapshots_create(
      customerConnection,
      {
        params: {
          orderId,
          itemId,
        },
        body,
      },
    );
  typia.assert(first);
  TestValidator.equals(
    "snapshot product name preserved",
    first.product_name,
    body.product_name,
  );
  TestValidator.equals(
    "snapshot product description preserved",
    first.product_description,
    body.product_description,
  );
  TestValidator.equals("snapshot sku preserved", first.sku_code, body.sku_code);
  TestValidator.equals(
    "snapshot unit price preserved",
    first.unit_price,
    body.unit_price,
  );
  TestValidator.equals(
    "snapshot belongs to requested order item",
    first.orderItem.id,
    itemId,
  );
  TestValidator.equals(
    "snapshot option count preserved",
    first.optionValues.length,
    body.optionValues?.length,
  );
  TestValidator.equals(
    "first option name preserved",
    first.optionValues[0].option_name,
    body.optionValues?.[0]?.option_name,
  );
  TestValidator.equals(
    "first option value preserved",
    first.optionValues[0].option_value,
    body.optionValues?.[0]?.option_value,
  );
  TestValidator.equals(
    "first option order preserved",
    first.optionValues[0].display_order,
    body.optionValues?.[0]?.display_order,
  );
  TestValidator.equals(
    "second option name preserved",
    first.optionValues[1].option_name,
    body.optionValues?.[1]?.option_name,
  );
  TestValidator.equals(
    "second option value preserved",
    first.optionValues[1].option_value,
    body.optionValues?.[1]?.option_value,
  );
  TestValidator.equals(
    "second option order preserved",
    first.optionValues[1].display_order,
    body.optionValues?.[1]?.display_order,
  );
  const preservedId = first.id;
  const preservedProductName = first.product_name;
  const preservedProductDescription = first.product_description;
  const preservedSkuCode = first.sku_code;
  const preservedUnitPrice = first.unit_price;
  const preservedOrderItemId = first.orderItem.id;
  const preservedOptionValues = first.optionValues.map((value) => ({
    option_name: value.option_name,
    option_value: value.option_value,
    display_order: value.display_order,
  }));
  await TestValidator.error(
    "duplicate product purchase snapshot rejected for same order item",
    async () => {
      await generate_random_shopping_mall_customer_orders_items_product_purchase_snapshots_create(
        customerConnection,
        {
          params: {
            orderId,
            itemId,
          },
          body,
        },
      );
    },
  );
  TestValidator.equals("original snapshot id unchanged", first.id, preservedId);
  TestValidator.equals(
    "original snapshot product name unchanged",
    first.product_name,
    preservedProductName,
  );
  TestValidator.equals(
    "original snapshot product description unchanged",
    first.product_description,
    preservedProductDescription,
  );
  TestValidator.equals(
    "original snapshot sku unchanged",
    first.sku_code,
    preservedSkuCode,
  );
  TestValidator.equals(
    "original snapshot unit price unchanged",
    first.unit_price,
    preservedUnitPrice,
  );
  TestValidator.equals(
    "original snapshot order item unchanged",
    first.orderItem.id,
    preservedOrderItemId,
  );
  TestValidator.equals(
    "original snapshot option values unchanged",
    first.optionValues.map((value) => ({
      option_name: value.option_name,
      option_value: value.option_value,
      display_order: value.display_order,
    })),
    preservedOptionValues,
  );
}
