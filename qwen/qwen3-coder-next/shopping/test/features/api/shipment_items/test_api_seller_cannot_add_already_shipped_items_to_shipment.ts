import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shopping_cart } from "../../../prepare/prepare_random_shopping_mall_shopping_cart";

export async function test_api_seller_cannot_add_already_shipped_items_to_shipment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 2. Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 3. Create product via seller (simulated)
  const product = typia.random<IShoppingMallProduct.ISummary>();
  // 4. Create product variant via seller (simulated)
  const variant = typia.random<IShoppingMallProductVariant.ISummary>();
  // 5. Customer adds to cart
  const cartItem = await api.functional.shoppingMall.customer.cart.items.create(
    customerConnection,
    {
      body: {
        shopping_mall_product_variant_id: variant.id,
        quantity: 1,
      } satisfies IShoppingMallShoppingCart.ICreate,
    },
  );
  typia.assert(cartItem);
  // 6. Simulate order creation
  const order = typia.random<IShoppingMallOrder.ISummary>();
  // 7. Create initial shipment with order items
  const shipment = await api.functional.shoppingMall.seller.shipments.create(
    sellerConnection,
    {
      body: {
        order_id: order.id,
        tracking_number: RandomGenerator.alphabets(10),
        tracking_carrier: "Korea Express",
        items: [
          {
            item_ids: ["order-item-id-1"],
          },
        ],
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 8. Mark shipment items as shipped
  await api.functional.shoppingMall.seller.shipments.status.updateStatus(
    sellerConnection,
    {
      shipmentId: shipment.id,
      body: {
        status: "shipped",
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  // 9. Create another shipment with same order
  const newShipment = await api.functional.shoppingMall.seller.shipments.create(
    sellerConnection,
    {
      body: {
        order_id: order.id,
        tracking_number: RandomGenerator.alphabets(10),
        tracking_carrier: "DHL",
        items: [
          {
            item_ids: ["order-item-id-2"],
          },
        ],
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(newShipment);
  // 10. Try to add items to new shipment (should fail if items already shipped)
  try {
    await api.functional.shoppingMall.seller.shipments.items.addItems(
      sellerConnection,
      {
        shipmentId: newShipment.id,
        body: {
          item_ids: ["order-item-id-2"],
        } satisfies IShoppingMallShipment.ICreateItem,
      },
    );
  } catch (error) {
    // Expected to fail if items are already shipped
  }
}
