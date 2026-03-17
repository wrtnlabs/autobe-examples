import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAttempt";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductPurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshot";
import type { IShoppingMallProductPurchaseSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshotOptionValue";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_orders_items_product_purchase_snapshots_create } from "../../../generate/generate_random_shopping_mall_customer_orders_items_product_purchase_snapshots_create";
import { generate_random_shopping_mall_customer_orders_items_product_purchase_snapshots_option_values_create } from "../../../generate/generate_random_shopping_mall_customer_orders_items_product_purchase_snapshots_option_values_create";
import { generate_random_shopping_mall_customer_payment_attempts_create } from "../../../generate/generate_random_shopping_mall_customer_payment_attempts_create";
import { generate_random_shopping_mall_customer_shipping_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_shipping_addresses_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_variants_create";
import { prepare_random_shopping_mall_payment_attempt } from "../../../prepare/prepare_random_shopping_mall_payment_attempt";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_purchase_snapshot } from "../../../prepare/prepare_random_shopping_mall_product_purchase_snapshot";
import { prepare_random_shopping_mall_product_purchase_snapshot_option_value } from "../../../prepare/prepare_random_shopping_mall_product_purchase_snapshot_option_value";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_shipping_address } from "../../../prepare/prepare_random_shopping_mall_shipping_address";

export async function test_api_product_purchase_snapshot_option_value_duplicate_name_conflict(
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
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const productPurchaseSnapshotId = typia.random<
    string & tags.Format<"uuid">
  >();
  const firstBody = {
    option_name: "Size",
    option_value: "Large",
    display_order: 1,
  } satisfies IShoppingMallProductPurchaseSnapshotOptionValue.ICreate;
  const first =
    await generate_random_shopping_mall_customer_orders_items_product_purchase_snapshots_option_values_create(
      customerConnection,
      {
        params: {
          orderId,
          itemId,
          productPurchaseSnapshotId,
        },
        body: firstBody,
      },
    );
  typia.assert(first);
  TestValidator.equals(
    "option name preserved",
    first.option_name,
    firstBody.option_name,
  );
  TestValidator.equals(
    "option value preserved",
    first.option_value,
    firstBody.option_value,
  );
  TestValidator.equals(
    "display order preserved",
    first.display_order,
    firstBody.display_order,
  );
  await TestValidator.error(
    "duplicate option_name conflicts within snapshot",
    async () => {
      await generate_random_shopping_mall_customer_orders_items_product_purchase_snapshots_option_values_create(
        customerConnection,
        {
          params: {
            orderId,
            itemId,
            productPurchaseSnapshotId,
          },
          body: {
            option_name: firstBody.option_name,
            option_value: "XL",
            display_order: 2,
          } satisfies IShoppingMallProductPurchaseSnapshotOptionValue.ICreate,
        },
      );
    },
  );
}
