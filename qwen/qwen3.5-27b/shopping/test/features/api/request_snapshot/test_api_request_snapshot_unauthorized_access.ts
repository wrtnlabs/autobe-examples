import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRequestSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_customer_orders_items_cancellation_create } from "../../../generate/generate_random_shopping_mall_customer_orders_items_cancellation_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that a seller cannot access request snapshots from requests they did not respond to.
 *
 * Validates the authorization control for request snapshot access, ensuring that sellers can only view snapshots of cancellation or refund requests they personally responded to. This test creates a scenario where seller A responds to a cancellation request (creating a snapshot), then attempts seller B to access that same snapshot, which should fail with unauthorized access.
 *
 * The test follows the natural flow of the shopping mall platform: seller registration, product creation, customer purchase, cancellation request creation, seller response, and finally unauthorized access attempt.
 *
 * 1. Register and authenticate as seller A.
 * 2. Register and authenticate as seller B.
 * 3. Register and authenticate as a customer.
 * 4. Seller A creates a product with variants and inventory.
 * 5. Customer adds product variant to cart and places an order.
 * 6. Customer creates a cancellation request for the order item.
 * 7. Seller A responds to the request (approve), which creates a snapshot.
 * 8. Seller B attempts to access the snapshot created by seller A.
 * 9. Verify that seller B receives an unauthorized access error (403 Forbidden).
 */
export async function test_api_request_snapshot_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerA);
  // 2. Register and authenticate as seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerB);
  // 3. Register and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 4. Seller A creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Seller A creates a product variant with inventory
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerAConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: typia.random<string & tags.Format<"uuid">>(),
          variantOptions: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
          initialStockQuantity: 10,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 6. Customer adds product variant to cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 1,
        } satisfies IShoppingMallCustomerCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 7. Customer places order (checkout)
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {
      body: undefined,
    },
  );
  typia.assert(order);
  // Get the order item from the order
  const orderItem = order.items[0];
  if (orderItem === undefined)
    throw new Error("Order should contain at least one item");
  // 8. Customer creates a cancellation request
  const cancellationRequest =
    await generate_random_shopping_mall_customer_orders_items_cancellation_create(
      customerConnection,
      {
        params: { orderId: order.id, itemId: orderItem.id },
        body: {
          reason: "I no longer need this item",
        } satisfies IShoppingMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // 9. Seller A approves the cancellation request (creates a snapshot)
  const approvedRequest =
    await api.functional.shoppingMall.seller.orders.items.cancellation.approve(
      sellerAConnection,
      {
        orderId: order.id,
        itemId: orderItem.id,
        body: {
          response_reason: "Approval from seller A",
        } satisfies IShoppingMallCancellationRequest.IApprove,
      },
    );
  typia.assert(approvedRequest);
  // Get the snapshot ID from the approved request snapshots
  const snapshot = approvedRequest.snapshots[0];
  if (snapshot === undefined)
    throw new Error("Approved request should contain at least one snapshot");
  // 10. Seller B attempts to access the snapshot (should fail with 403)
  await TestValidator.httpError(
    "seller B cannot access seller A's snapshot",
    403,
    async () => {
      await api.functional.shoppingMall.seller.request_snapshots.at(
        sellerBConnection,
        {
          snapshotId: snapshot.id,
        },
      );
    },
  );
}
