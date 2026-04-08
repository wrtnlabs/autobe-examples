import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_member_cart_items_create } from "../../../generate/generate_random_shopping_mall_member_cart_items_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_records_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that a seller cannot update tracking information for a shipment owned by a different seller.
 *
 * Validates the security boundary that prevents sellers from modifying shipments they do not own. The test creates a complete order fulfillment workflow with Seller A, then attempts to have Seller B update Seller A's shipment tracking information.
 *
 * The test ensures that the shipment ownership validation is properly enforced at the API level, protecting sellers from unauthorized modifications to their fulfillment data and maintaining data integrity across the platform.
 *
 * 1. Seller A registers and logs in to the platform.
 * 2. Seller A creates a product with a variant and adds inventory stock.
 * 3. Customer registers, adds product to cart, and creates an order.
 * 4. Seller A creates a shipment for the order items with tracking information.
 * 5. Seller B registers and logs in as a separate seller account.
 * 6. Seller B attempts to update Seller A's shipment tracking information.
 * 7. Validates that the update is rejected with appropriate error status (404 or 403).
 */
export async function test_api_shipment_tracking_update_wrong_seller_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerA);
  // Note: In real scenario, seller needs admin approval before selling
  // For this test, we assume seller A is already approved
  // 2. Seller A creates a product
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerAConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Seller A creates a product variant
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerAConnection,
      {
        productId: product.id,
        body: {
          sku_code: RandomGenerator.alphaNumeric(8),
          option_values: "Color: Red, Size: Large",
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Seller A adds inventory stock to the variant
  const inventoryRecord =
    await api.functional.shoppingMall.seller.variants.inventory_records.create(
      sellerAConnection,
      {
        variantId: variant.id,
        body: {
          quantity_delta: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
          >(),
          reason: "RESTOCK",
        } satisfies IShoppingMallInventoryRecord.ICreate,
      },
    );
  typia.assert(inventoryRecord);
  // 5. Customer registers
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(customer);
  // 6. Customer adds product variant to cart
  const cartItem = await api.functional.shoppingMall.member.cart.items.create(
    customerConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      } satisfies IShoppingMallCartItem.ICreate,
    },
  );
  typia.assert(cartItem);
  // 7. Customer creates an order
  // Note: This requires a valid customer address ID
  const order = await api.functional.shoppingMall.member.orders.create(
    customerConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 8. Seller A creates a shipment for the order items
  const orderItemId = order.orderItems[0]?.id;
  if (!orderItemId) {
    throw new Error("Order has no items");
  }
  const shipment =
    await api.functional.shoppingMall.seller.orders.shipments.create(
      sellerAConnection,
      {
        orderId: order.id,
        body: {
          order_item_ids: [orderItemId],
          carrier_name: "FedEx",
          tracking_number: RandomGenerator.alphaNumeric(12),
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 9. Register and login Seller B (different seller)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerB);
  // 10. Seller B attempts to update Seller A's shipment (should fail)
  await TestValidator.error(
    "wrong seller shipment update rejected",
    async () => {
      await api.functional.shoppingMall.seller.seller.shipments.update(
        sellerBConnection,
        {
          shipmentId: shipment.id,
          body: {
            carrier_name: "UPS",
            tracking_number: RandomGenerator.alphaNumeric(12),
          } satisfies IShoppingMallShipment.IUpdate,
        },
      );
    },
  );
}
