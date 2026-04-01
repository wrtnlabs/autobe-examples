import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
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
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

/**
 * Test edge case where the order item snapshot has no variant options (simple product without configurable options like Color or Size).
 * The endpoint should return an empty array with valid pagination metadata.
 *
 * Test Steps:
 * 1. Register a new customer account via /shoppingMall/auth/customer/join
 * 2. Create a shipping address for the customer via /shoppingMall/customer/addresses
 * 3. Add a simple product variant (no option definitions) to the cart via /shoppingMall/customer/cart/items
 * 4. Create an order via /shoppingMall/customer/orders
 * 5. Retrieve the variant options for the order item snapshot via the target endpoint
 *
 * Validation Points:
 * - Response data array is empty (no variant options)
 * - Pagination metadata is still present and valid (current: 1, limit: 10, records: 0, pages: 0)
 * - No errors are thrown for valid order item snapshots without options
 * - HTTP status is 200 (success, not 404)
 *
 * Business Logic:
 * - Products without option definitions have variants with no associated variant options
 * - Snapshot preservation still occurs even for simple products per requirements [161], [240]
 * - Empty result is valid business case, not an error condition
 * - Per operation specification: 'Return empty array if snapshot has no variant options (simple product without options)'
 */
export async function test_api_order_item_snapshot_variant_options_simple_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create shipping address for the customer
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(),
        state: RandomGenerator.name(),
        postalCode: "10001",
        country: "United States",
        isDefault: true,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address);
  // 3. Add simple product variant (no options) to cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: typia.random<string & tags.Format<"uuid">>(),
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 4. Create order (this generates order item snapshots)
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shopping_mall_address_id: address.id,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 5. Retrieve variant options for the order item snapshot
  // For simple products without options, this should return empty array with valid pagination
  const orderId = order.id;
  const itemId = order.orderItems[0]!.id;
  // Snapshot is created per order item during order placement
  // Using order item ID as snapshot ID reference (1:1 relationship)
  const snapshotId = itemId;
  const variantOptionsResult =
    await api.functional.shoppingMall.customer.orders.items.snapshots.variant_options.index(
      customerConnection,
      {
        orderId: orderId,
        itemId: itemId,
        snapshotId: snapshotId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrderItemSnapshotVariantOption.IRequest,
      },
    );
  typia.assert(variantOptionsResult);
  // Validate pagination metadata is present and valid
  TestValidator.equals(
    "current page",
    variantOptionsResult.pagination.current,
    1,
  );
  TestValidator.equals("limit", variantOptionsResult.pagination.limit, 10);
  TestValidator.predicate(
    "records is 0 for simple product",
    variantOptionsResult.pagination.records === 0,
  );
  TestValidator.predicate(
    "pages is 0 for empty result",
    variantOptionsResult.pagination.pages === 0,
  );
  // Validate data array is empty (no variant options for simple product)
  TestValidator.equals(
    "data array is empty",
    variantOptionsResult.data.length,
    0,
  );
}