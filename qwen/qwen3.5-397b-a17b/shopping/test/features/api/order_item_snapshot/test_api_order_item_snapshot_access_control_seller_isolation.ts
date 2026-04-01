import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test that a seller cannot access order item snapshots belonging to another seller's products.
 *
 * Setup:
 * 1. Seller 1 authenticates via join
 * 2. Seller 1 creates a product
 * 3. Seller 2 authenticates via join
 * 4. Seller 2 creates a product
 * 5. Customer authenticates via join
 * 6. Customer places an order (which will include available products)
 * 7. Seller 2 lists their order items to obtain the order item ID
 * 8. Seller 2 retrieves the snapshot for their order item to obtain the snapshot ID
 *
 * Test:
 * Seller 1 attempts to retrieve the snapshot using Seller 2's order item ID and snapshot ID.
 *
 * Validate:
 * System returns 403 Forbidden error because the order item's seller does not match
 * the authenticated seller (Seller 1). This validates the authorization rule that sellers
 * can only view snapshots for order items they own, ensuring proper data isolation
 * between competing sellers on the platform.
 */
export async function test_api_order_item_snapshot_access_control_seller_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller 1 setup
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller1Auth);
  // 2. Seller 1 creates a product
  const seller1Product =
    await generate_random_shopping_mall_seller_products_create(
      seller1Connection,
      {},
    );
  typia.assert(seller1Product);
  // 3. Seller 2 setup
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Auth = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller2Auth);
  // 4. Seller 2 creates a product
  const seller2Product =
    await generate_random_shopping_mall_seller_products_create(
      seller2Connection,
      {},
    );
  typia.assert(seller2Product);
  // 5. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 6. Customer places order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // 7. Seller 2 lists their order items
  const seller2OrderItems =
    await api.functional.shoppingMall.seller.orders.items.index(
      seller2Connection,
      {
        body: {
          shopping_mall_order_id: order.id,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(seller2OrderItems);
  // Validate seller 2 has order items and get the first one
  TestValidator.predicate(
    "seller 2 has order items",
    () => seller2OrderItems.data.length > 0,
  );
  const seller2OrderItem = seller2OrderItems.data[0];
  TestValidator.equals(
    "order item seller matches seller 2",
    seller2OrderItem.seller.id,
    seller2Auth.id,
  );
  // 8. Seller 2 retrieves snapshot for their order item
  const seller2Snapshot =
    await api.functional.shoppingMall.seller.orders.items.snapshots.patchByItemid(
      seller2Connection,
      {
        itemId: seller2OrderItem.id,
      },
    );
  typia.assert(seller2Snapshot);
  const snapshotId = seller2Snapshot.id;
  const orderItemId = seller2OrderItem.id;
  // 9. Test: Seller 1 attempts to access seller 2's order item snapshot
  await TestValidator.httpError(
    "seller 1 cannot access seller 2's order item snapshot",
    403,
    async () => {
      await api.functional.shoppingMall.seller.orders.items.snapshots.getByItemidAndSnapshotid(
        seller1Connection,
        {
          itemId: orderItemId,
          snapshotId: snapshotId,
        },
      );
    },
  );
}
