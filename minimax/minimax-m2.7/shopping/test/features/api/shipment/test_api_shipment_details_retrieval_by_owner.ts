import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_customer_customers_me_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_cart_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_create";
import { generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { prepare_random_ecommerce_mall_cart } from "../../../prepare/prepare_random_ecommerce_mall_cart";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test retrieving detailed information about a shipment created by the authenticated seller.
 *
 * Validates the complete shipment details retrieval endpoint for order fulfillment tracking and dispute resolution purposes. Verifies that the response includes: (1) shipment basic info - carrier name, tracking number, created_at, updated_at; (2) order summary with customer info; (3) seller summary; (4) array of shipment items, each containing shipment item ID, order item details (quantity, unit_price, status), product snapshot details (name, description, base_price, category_name), and variant option values captured at purchase time.
 *
 * **Test Flow:**
 * 1. Register and login as approved seller
 * 2. Register and login as customer
 * 3. Seller creates a product with variant (for cart)
 * 4. Customer adds product to cart
 * 5. Customer creates order with shipping address
 * 6. Seller creates shipment for order items
 * 7. Seller retrieves shipment details and validates response
 *
 * **Validations:**
 * - Shipment basic info: carrier name, tracking number, created_at, updated_at
 * - Order summary with customer info
 * - Seller summary
 * - Shipment items array with complete order item details, product snapshots, and variant options
 */
export async function test_api_shipment_details_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Login as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 3. Create product with variant (via generation function)
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // Get variant ID for cart
  const variantId = product.variants[0]?.id;
  TestValidator.predicate("product has variant", variantId !== undefined);
  // 4. Add product to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_customers_me_cart_create(
      customerConnection,
      {
        body: {
          variantId: variantId!,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        },
      },
    );
  typia.assert(cartItem);
  // 5. Create order with shipping address
  const order =
    await generate_random_ecommerce_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Get order item ID for shipment
  const orderItemId = order.orderItems[0]?.id;
  TestValidator.predicate("order has items", orderItemId !== undefined);
  // 6. Seller creates shipment for order items
  const shipment =
    await generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create(
      sellerConnection,
      {
        params: { itemId: orderItemId! },
        body: {
          itemIds: [orderItemId!],
          carrier: "DHL",
          trackingNumber: "1234567890",
        },
      },
    );
  typia.assert(shipment);
  TestValidator.equals("carrier matches", shipment.carrier, "DHL");
  TestValidator.equals(
    "tracking number matches",
    shipment.trackingNumber,
    "1234567890",
  );
  // 7. Seller retrieves shipment details
  const shipmentDetails =
    await api.functional.ecommerceMall.seller.sellers.me.shipments.at(
      sellerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(shipmentDetails);
  // Validate shipment basic info
  TestValidator.equals("shipment id matches", shipmentDetails.id, shipment.id);
  TestValidator.equals("carrier matches", shipmentDetails.carrier, "DHL");
  TestValidator.equals(
    "tracking number matches",
    shipmentDetails.trackingNumber,
    "1234567890",
  );
  TestValidator.predicate(
    "has created_at",
    shipmentDetails.createdAt !== undefined,
  );
  TestValidator.predicate(
    "has updated_at",
    shipmentDetails.updatedAt !== undefined,
  );
  // Validate order summary
  TestValidator.predicate(
    "has order summary",
    shipmentDetails.order !== undefined,
  );
  TestValidator.equals("order id matches", shipmentDetails.order.id, order.id);
  TestValidator.equals(
    "order number matches",
    shipmentDetails.order.order_number,
    order.order_number,
  );
  // Validate seller summary
  TestValidator.predicate(
    "has seller summary",
    shipmentDetails.seller !== undefined,
  );
  TestValidator.equals(
    "seller id matches",
    shipmentDetails.seller.id,
    sellerAuth.id,
  );
  // Validate shipment items
  TestValidator.predicate(
    "has shipment items",
    shipmentDetails.shipmentItems !== undefined,
  );
  TestValidator.equals(
    "has one shipment item",
    shipmentDetails.shipmentItems.length,
    1,
  );
  const shipmentItem = shipmentDetails.shipmentItems[0];
  typia.assert(shipmentItem);
  // Validate shipment item ID
  TestValidator.predicate(
    "has shipment item id",
    shipmentItem.shipmentItemId !== undefined,
  );
  TestValidator.predicate(
    "has created at",
    shipmentItem.createdAt !== undefined,
  );
  // Validate order item details in shipment item
  TestValidator.predicate("has id", shipmentItem.id !== undefined);
  TestValidator.equals(
    "quantity matches",
    shipmentItem.quantity,
    cartItem.quantity,
  );
  TestValidator.predicate("has unit price", shipmentItem.unitPrice > 0);
  TestValidator.equals("status is shipped", shipmentItem.status, "shipped");
  // Validate product snapshot
  TestValidator.predicate(
    "has product snapshot",
    shipmentItem.productSnapshot !== undefined,
  );
  TestValidator.equals(
    "product name matches",
    shipmentItem.productSnapshot.name,
    product.name,
  );
  TestValidator.equals(
    "product description exists",
    shipmentItem.productSnapshot.description.length > 0,
    true,
  );
  TestValidator.equals(
    "base price matches",
    shipmentItem.productSnapshot.basePrice,
    product.basePrice,
  );
  TestValidator.equals(
    "category name matches",
    shipmentItem.productSnapshot.categoryName,
    product.category.name,
  );
  // Validate variant options (object with id, key, value, created_at)
  TestValidator.predicate(
    "has variant options",
    shipmentItem.variantOptions !== undefined,
  );
  TestValidator.equals(
    "variant options is object",
    typeof shipmentItem.variantOptions === "object",
    true,
  );
  TestValidator.predicate(
    "variant option has key",
    shipmentItem.variantOptions.key !== undefined,
  );
  TestValidator.predicate(
    "variant option has value",
    shipmentItem.variantOptions.value !== undefined,
  );
}
