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
import { generate_random_shopping_mall_customer_orders_items_product_purchase_snapshots_option_values_create } from "../../../generate/generate_random_shopping_mall_customer_orders_items_product_purchase_snapshots_option_values_create";
import { generate_random_shopping_mall_customer_payment_attempts_create } from "../../../generate/generate_random_shopping_mall_customer_payment_attempts_create";
import { prepare_random_shopping_mall_payment_attempt } from "../../../prepare/prepare_random_shopping_mall_payment_attempt";
import { prepare_random_shopping_mall_product_purchase_snapshot } from "../../../prepare/prepare_random_shopping_mall_product_purchase_snapshot";
import { prepare_random_shopping_mall_product_purchase_snapshot_option_value } from "../../../prepare/prepare_random_shopping_mall_product_purchase_snapshot_option_value";

export async function test_api_product_purchase_snapshot_option_value_parent_chain_mismatch(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = {
    host: connection.host,
  };
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
          amount: 1000,
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
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const validItemId = typia.random<string & tags.Format<"uuid">>();
  const snapshotBody = {
    product_name: RandomGenerator.name(),
    product_description: RandomGenerator.content({ paragraphs: 2 }),
    sku_code: RandomGenerator.alphaNumeric(12),
    unit_price: 1000,
    optionValues: [
      {
        option_name: "Color",
        option_value: "Red",
        display_order: typia.random<number & tags.Type<"int32">>(),
      },
    ],
  } satisfies IShoppingMallProductPurchaseSnapshot.ICreate;
  const snapshot =
    await generate_random_shopping_mall_customer_orders_items_product_purchase_snapshots_create(
      customerConnection,
      {
        params: {
          orderId,
          itemId: validItemId,
        },
        body: snapshotBody,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot belongs to requested item",
    snapshot.orderItem.id,
    validItemId,
  );
  const originalOptionValueCount = snapshot.optionValues.length;
  const mismatchedItemId = typia.random<string & tags.Format<"uuid">>();
  const optionValueBody = {
    option_name: "Size",
    option_value: "Large",
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallProductPurchaseSnapshotOptionValue.ICreate;
  await TestValidator.httpError(
    "reject mismatched parent chain for snapshot option value creation",
    [400, 404, 409, 422],
    async () => {
      await generate_random_shopping_mall_customer_orders_items_product_purchase_snapshots_option_values_create(
        customerConnection,
        {
          params: {
            orderId,
            itemId: mismatchedItemId,
            productPurchaseSnapshotId: snapshot.id,
          },
          body: optionValueBody,
        },
      );
    },
  );
  TestValidator.equals(
    "failed mismatch attempt leaves local snapshot option count unchanged",
    snapshot.optionValues.length,
    originalOptionValueCount,
  );
}
