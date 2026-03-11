import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipmentItem";
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
import { generate_random_ecommerce_mall_customer_carts_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_carts_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_customer_shipment_items_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - join and create product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: typia.random<IEcommerceMallSeller.IJoin>(),
  });
  typia.assert(sellerConnection.headers);
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        is_active: true,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 2. Customer setup - join and create cart
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: typia.random<IEcommerceMallCustomer.IJoin>(),
  });
  typia.assert(customerConnection.headers);
  const cart =
    await api.functional.ecommerceMall.customer.carts.create(
      customerConnection,
    );
  typia.assert(cart);
  // 3. Add product variant to cart
  const cartItem =
    await api.functional.ecommerceMall.customer.carts.items.create(
      customerConnection,
      {
        cartId: cart.id,
        body: {
          variant_id:
            product.variants[0]?.id ??
            typia.random<string & tags.Format<"uuid">>(),
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 4. Test shipment items filtering by status
  // The scenario assumes pre-existing order with multiple items in different statuses
  // We test the filter endpoint with various status values
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  // Test case 1: Filter by "shipped" status
  const shippedItems =
    await api.functional.ecommerceMall.customer.orders.shipments.items.index(
      customerConnection,
      {
        orderId,
        shipmentId,
        body: {
          itemStatus: "shipped",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallShipmentItem.IRequest,
      },
    );
  typia.assert(shippedItems);
  // Validate shipment context for each shipped item
  for (const item of shippedItems.data) {
    typia.assert(item);
    TestValidator.equals(
      "shipped item references correct shipment",
      item.shipment.id,
      shipmentId,
    );
    typia.assert(item.orderItem);
    TestValidator.equals(
      "shipped item has correct status",
      item.orderItem.item_status,
      "shipped",
    );
  }
  // Test case 2: Filter by "delivered" status
  const deliveredItems =
    await api.functional.ecommerceMall.customer.orders.shipments.items.index(
      customerConnection,
      {
        orderId,
        shipmentId,
        body: {
          itemStatus: "delivered",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallShipmentItem.IRequest,
      },
    );
  typia.assert(deliveredItems);
  // Validate shipment context for each delivered item
  for (const item of deliveredItems.data) {
    typia.assert(item);
    TestValidator.equals(
      "delivered item references correct shipment",
      item.shipment.id,
      shipmentId,
    );
    typia.assert(item.orderItem);
    TestValidator.equals(
      "delivered item has correct status",
      item.orderItem.item_status,
      "delivered",
    );
  }
  // Test case 3: Filter by "cancelled" status (edge case - may return empty results)
  const cancelledItems =
    await api.functional.ecommerceMall.customer.orders.shipments.items.index(
      customerConnection,
      {
        orderId,
        shipmentId,
        body: {
          itemStatus: "cancelled",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallShipmentItem.IRequest,
      },
    );
  typia.assert(cancelledItems);
  // Validate edge case: empty results with correct pagination metadata
  if (cancelledItems.data.length === 0) {
    TestValidator.equals(
      "cancelled filter returns empty data array",
      cancelledItems.data.length,
      0,
    );
    TestValidator.equals(
      "cancelled filter shows zero records when no matches",
      cancelledItems.pagination.records,
      0,
    );
    TestValidator.equals(
      "cancelled filter shows zero pages when no results",
      cancelledItems.pagination.pages,
      0,
    );
  }
  // Validate no items from other shipments or orders appear in results
  for (const item of [
    ...shippedItems.data,
    ...deliveredItems.data,
    ...cancelledItems.data,
  ]) {
    typia.assert(item);
    TestValidator.equals(
      "no cross-shipment data - shipmentId",
      item.shipment.id,
      shipmentId,
    );
    typia.assert(item.orderItem);
  }
}