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

export async function test_api_product_purchase_snapshot_order_item_mismatch_rejected(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  const orphanOrderId = typia.random<string & tags.Format<"uuid">>();
  const orphanItemId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    product_name: RandomGenerator.name(),
    product_description: RandomGenerator.content({ paragraphs: 2 }),
    sku_code: RandomGenerator.alphaNumeric(12),
    unit_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1>
    >() satisfies number as number,
    optionValues: [
      {
        option_name: "Color",
        option_value: RandomGenerator.name(1),
        display_order: 1 satisfies number as number & tags.Type<"int32">,
      },
      {
        option_name: "Size",
        option_value: RandomGenerator.name(1),
        display_order: 2 satisfies number as number & tags.Type<"int32">,
      },
    ],
  } satisfies IShoppingMallProductPurchaseSnapshot.ICreate;
  await TestValidator.error(
    "rejects product purchase snapshot creation for invalid order and item route combination",
    async () => {
      await generate_random_shopping_mall_customer_orders_items_product_purchase_snapshots_create(
        customerConnection,
        {
          params: {
            orderId: orphanOrderId,
            itemId: orphanItemId,
          },
          body,
        },
      );
    },
  );
}
