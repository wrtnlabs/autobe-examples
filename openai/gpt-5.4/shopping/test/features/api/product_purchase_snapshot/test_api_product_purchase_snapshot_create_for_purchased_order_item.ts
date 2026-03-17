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

export async function test_api_product_purchase_snapshot_create_for_purchased_order_item(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = {
    host: connection.host,
  };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "$trongPassword1234",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallCustomer.IJoin;
  const authorized = await authorize_customer_join(customerConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
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
  TestValidator.equals(
    "payment attempt belongs to authorized customer",
    paymentAttempt.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "payment attempt customer email matches authorized customer",
    paymentAttempt.customer.email,
    authorized.email,
  );
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const optionValues = [
    {
      option_name: "Material",
      option_value: RandomGenerator.name(1),
      display_order: 2 satisfies number as number & tags.Type<"int32">,
    },
    {
      option_name: "Color",
      option_value: RandomGenerator.name(1),
      display_order: 0 satisfies number as number & tags.Type<"int32">,
    },
    {
      option_name: "Size",
      option_value: RandomGenerator.name(1),
      display_order: 1 satisfies number as number & tags.Type<"int32">,
    },
  ] satisfies IShoppingMallProductPurchaseSnapshotOptionValue.ICreate[];
  const body = {
    shopping_mall_product_id: null,
    shopping_mall_product_variant_id: null,
    product_name: RandomGenerator.name(2),
    product_description: RandomGenerator.content({ paragraphs: 2 }),
    sku_code: `sku-${RandomGenerator.alphaNumeric(8)}`,
    unit_price: 100,
    optionValues,
  } satisfies IShoppingMallProductPurchaseSnapshot.ICreate;
  const snapshot =
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
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot product name",
    snapshot.product_name,
    body.product_name,
  );
  TestValidator.equals(
    "snapshot product description",
    snapshot.product_description,
    body.product_description,
  );
  TestValidator.equals("snapshot sku code", snapshot.sku_code, body.sku_code);
  TestValidator.equals(
    "snapshot unit price",
    snapshot.unit_price,
    body.unit_price,
  );
  TestValidator.equals("snapshot order item id", snapshot.orderItem.id, itemId);
  TestValidator.equals(
    "snapshot order item unit price",
    snapshot.orderItem.unit_price,
    snapshot.unit_price,
  );
  TestValidator.equals(
    "snapshot product traceability null",
    snapshot.product,
    null,
  );
  TestValidator.equals(
    "snapshot product variant traceability null",
    snapshot.productVariant,
    null,
  );
  TestValidator.equals(
    "snapshot option value count",
    snapshot.optionValues.length,
    optionValues.length,
  );
  TestValidator.predicate(
    "snapshot option values sorted by display order",
    snapshot.optionValues.every(
      (value, index, array) =>
        index === 0 || array[index - 1]!.display_order <= value.display_order,
    ),
  );
  TestValidator.equals(
    "first option display order",
    snapshot.optionValues[0]!.display_order,
    0,
  );
  TestValidator.equals(
    "second option display order",
    snapshot.optionValues[1]!.display_order,
    1,
  );
  TestValidator.equals(
    "third option display order",
    snapshot.optionValues[2]!.display_order,
    2,
  );
  TestValidator.equals(
    "first option name preserved",
    snapshot.optionValues[0]!.option_name,
    "Color",
  );
  TestValidator.equals(
    "second option name preserved",
    snapshot.optionValues[1]!.option_name,
    "Size",
  );
  TestValidator.equals(
    "third option name preserved",
    snapshot.optionValues[2]!.option_name,
    "Material",
  );
}
