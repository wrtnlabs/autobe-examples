import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_order } from "../prepare/prepare_random_shopping_mall_order";

/**
 * Generate a random shopping mall order by checking out from the customer's shopping cart for E2E testing.
 *
 * Prepares random checkout data using the prepare function, then calls the checkout endpoint to create a new order. The order is created with all order items from the customer's cart, payment processing, inventory deduction, and cart clearing. The shipping address is preserved from the customer's address book at the time of order placement.
 *
 * This function requires that the customer has items in their shopping cart and at least one shipping address before calling. The order number is generated automatically by the system.
 */
export async function generate_random_shopping_mall_customer_customers_me_checkout_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallOrder.ICreate> | undefined;
  },
): Promise<IShoppingMallOrder> {
  const prepared: IShoppingMallOrder.ICreate =
    prepare_random_shopping_mall_order(props.body);
  return await api.functional.shoppingMall.customer.customers.me.checkout.create(
    connection,
    {
      body: prepared,
    },
  );
}
