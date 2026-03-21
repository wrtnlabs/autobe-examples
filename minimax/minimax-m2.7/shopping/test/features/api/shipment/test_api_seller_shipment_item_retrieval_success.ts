import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test scenario for seller successfully retrieving detailed information about a shipment item.
 *
 * **Setup Steps:**
 * 1. Register a seller account via POST /ecommerceMall/auth/seller/join
 * 2. Register a customer account via POST /ecommerceMall/auth/customer/join
 * 3. Seller creates a product with name, description, base price via POST /ecommerceMall/seller/products
 * 4. Seller creates a product variant with SKU code and inventory via POST /ecommerceMall/seller/products/{productId}/variants
 * 5. Seller adds inventory to the variant via POST /ecommerceMall/seller/products/{productId}/variants/{variantId}/inventory
 * 6. Customer adds the variant to cart via POST /ecommerceMall/customer/cart/items
 * 7. Customer confirms checkout via POST /ecommerceMall/customer/checkout/confirm (order created with order items in 'paid' status)
 * 8. Seller creates a shipment with the order item via POST /ecommerceMall/seller/shipments
 *
 * **Test Execution:**
 * - Call GET /ecommerceMall/seller/shipments/{shipmentId}/items/{itemId}
 * - The shipmentId and itemId should be from the created shipment
 *
 * **Expected Validations:**
 * - Response contains id, created_at, orderItem
 * - orderItem contains: id, quantity, unitPrice, status='shipped', productSnapshot, sellerProfileSnapshot, productVariant
 * - productSnapshot contains: name, description, base_price, category_name, seller info
 * - productVariant contains: sku_code, optionValues (array), quantity
 * - Verify nested data matches the original product/variant created at purchase time
 */
export async function test_api_seller_shipment_item_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // 2. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  // 3. Seller creates a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        base_price: typia.random<
          number & tags.Minimum<1000> & tags.Maximum<100000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product);
  // 4. Seller creates a product variant
  const variant =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(12),
          option_values: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
        },
      },
    );
  typia.assert(variant);
  // 5. Seller adds inventory to the variant
  await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
    sellerConnection,
    {
      params: { productId: product.id, variantId: variant.id },
      body: {
        operation: "restock",
        quantity: 10,
        reason: "Initial stock",
      },
    },
  );
  // 6. Customer adds the variant to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variant.id,
          quantity: 2,
        },
      },
    );
  typia.assert(cartItem);
  // 7. Customer confirms checkout (order created with order items in 'paid' status)
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token:
            "mock_payment_token_" + RandomGenerator.alphaNumeric(8),
        },
      },
    );
  typia.assert(order);
  // Find the order item from the created order
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // Verify order item status is 'paid' before shipping
  TestValidator.equals(
    "order item status before shipping",
    orderItem.status,
    "paid",
  );
  // 8. Seller creates a shipment with the order item
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderId: order.id,
        orderItemIds: [orderItem.id],
        carrier: "DHL",
        trackingNumber: "DHL" + RandomGenerator.alphaNumeric(10),
      },
    },
  );
  typia.assert(shipment);
  // Get the shipment item ID
  const shipmentItem = shipment.shipment_items[0];
  typia.assert(shipmentItem);
  // 9. Seller retrieves the shipment item details
  const shipmentItemDetail =
    await api.functional.ecommerceMall.seller.shipments.items.at(
      sellerConnection,
      {
        shipmentId: shipment.id,
        itemId: shipmentItem.id,
      },
    );
  typia.assert(shipmentItemDetail);
  // Validate response structure
  TestValidator.equals("shipment item has id", !!shipmentItemDetail.id, true);
  TestValidator.equals(
    "shipment item created_at exists",
    !!shipmentItemDetail.created_at,
    true,
  );
  TestValidator.equals(
    "shipment item has orderItem",
    !!shipmentItemDetail.orderItem,
    true,
  );
  // Validate orderItem structure
  const retrievedOrderItem = shipmentItemDetail.orderItem;
  TestValidator.equals(
    "orderItem id matches",
    retrievedOrderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "orderItem quantity matches",
    retrievedOrderItem.quantity,
    orderItem.quantity,
  );
  TestValidator.equals(
    "orderItem unitPrice matches",
    retrievedOrderItem.unitPrice,
    orderItem.unitPrice,
  );
  TestValidator.equals(
    "orderItem status is shipped",
    retrievedOrderItem.status,
    "shipped",
  );
  // Validate productSnapshot
  const productSnapshot = retrievedOrderItem.productSnapshot;
  TestValidator.equals(
    "productSnapshot has name",
    !!productSnapshot.name,
    true,
  );
  TestValidator.equals(
    "productSnapshot has description",
    !!productSnapshot.description,
    true,
  );
  TestValidator.equals(
    "productSnapshot has base_price",
    typeof productSnapshot.base_price === "number",
    true,
  );
  TestValidator.equals(
    "productSnapshot has category_name",
    !!productSnapshot.category_name,
    true,
  );
  TestValidator.equals(
    "productSnapshot has seller",
    !!productSnapshot.seller,
    true,
  );
  // Validate sellerProfileSnapshot
  const sellerProfileSnapshot = retrievedOrderItem.sellerProfileSnapshot;
  TestValidator.equals(
    "sellerProfileSnapshot has shop_name",
    !!sellerProfileSnapshot.shop_name,
    true,
  );
  // Validate productVariant
  const productVariant = retrievedOrderItem.productVariant;
  TestValidator.equals(
    "productVariant has sku_code",
    !!productVariant.sku_code,
    true,
  );
  TestValidator.equals(
    "productVariant has optionValues array",
    Array.isArray(productVariant.optionValues),
    true,
  );
  TestValidator.equals(
    "productVariant optionValues has entries",
    productVariant.optionValues.length > 0,
    true,
  );
  TestValidator.equals(
    "productVariant has quantity",
    typeof productVariant.quantity === "number",
    true,
  );
}
