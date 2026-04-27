import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
import type { IECommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequestSnapshot";
import type { IECommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCartItem";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerAddress";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallInventoryRecord";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSellerSnapshot";
import type { IECommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSnapshot";
import type { IECommerceMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemStatusLog";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
import type { IECommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequestSnapshot";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipment";
import type { IECommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipmentItem";
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
import { generate_random_e_commerce_mall_customer_addresses_create } from "../../../generate/generate_random_e_commerce_mall_customer_addresses_create";
import { generate_random_e_commerce_mall_customer_cart_items_create } from "../../../generate/generate_random_e_commerce_mall_customer_cart_items_create";
import { generate_random_e_commerce_mall_customer_orders_create } from "../../../generate/generate_random_e_commerce_mall_customer_orders_create";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_products_variants_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_create";
import { generate_random_e_commerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_inventory_create";
import { generate_random_e_commerce_mall_seller_shipments_create } from "../../../generate/generate_random_e_commerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_seller_shipment_item_retrieval_with_complete_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
    },
  });
  const sellerShopName: string = sellerAuth.profile!.shopName;
  // 2. Create a product
  const productName = RandomGenerator.paragraph({ sentences: 2 });
  const productDescription = RandomGenerator.content({ paragraphs: 1 });
  const productBasePrice: number = 20000;
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: productName,
        description: productDescription,
        base_price: productBasePrice,
      },
    },
  );
  typia.assert(product);
  // 3. Create a variant with known SKU and price override
  const variantSku = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  const variantPrice: number = 25000;
  const variant =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: variantSku,
          price: variantPrice,
          options: [{ key: "color", value: "Red" }],
        },
      },
    );
  typia.assert(variant);
  // 4. Restock the variant
  await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
    sellerConnection,
    {
      params: { productId: product.id, variantId: variant.id },
      body: {
        quantity_change: 100,
        reason: "initial restock",
      },
    },
  );
  // 5. Register and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 6. Create a shipping address
  const address =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 7. Add variant to cart
  await generate_random_e_commerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: 2,
      },
    },
  );
  // 8. Place the order
  const order = await generate_random_e_commerce_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        addressId: address.id,
      },
    },
  );
  typia.assert(order);
  const orderItem = order.orderItems[0]!;
  typia.assert(orderItem);
  // 9. Re-authenticate as seller
  const sellerConnection2: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection2, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 10. Create a shipment containing the order item
  const shipment =
    await generate_random_e_commerce_mall_seller_shipments_create(
      sellerConnection2,
      {
        body: {
          carrierName: "FedEx",
          trackingNumber: "TRACK123",
          orderItemIds: [orderItem.id],
        },
      },
    );
  typia.assert(shipment);
  // 11. Retrieve the shipment item with complete details
  const shipmentItem =
    await api.functional.eCommerceMall.seller.shipments.items.at(
      sellerConnection2,
      {
        shipmentId: shipment.id,
        itemId: orderItem.id,
      },
    );
  typia.assert(shipmentItem);
  // 12. Assertions - shipment details
  TestValidator.equals(
    "carrier name",
    shipmentItem.shipment.carrier_name,
    "FedEx",
  );
  TestValidator.equals(
    "tracking number",
    shipmentItem.shipment.tracking_number,
    "TRACK123",
  );
  TestValidator.predicate(
    "shipped_at is non-null",
    () => shipmentItem.shipment.shipped_at !== null,
  );
  TestValidator.predicate(
    "delivered_at is null",
    () => shipmentItem.shipment.delivered_at === null,
  );
  TestValidator.equals(
    "seller id matches",
    shipmentItem.shipment.seller.id,
    sellerAuth.id,
  );
  TestValidator.predicate(
    "order_items_count >= 1",
    () => shipmentItem.shipment.order_items_count >= 1,
  );
  // 13. Assertions - order item details
  TestValidator.equals(
    "product name",
    shipmentItem.orderItem.product_name,
    productName,
  );
  TestValidator.equals(
    "variant sku",
    shipmentItem.orderItem.variant_sku,
    variantSku,
  );
  TestValidator.equals("quantity", shipmentItem.orderItem.quantity, 2);
  TestValidator.equals(
    "unit price",
    shipmentItem.orderItem.unit_price,
    variantPrice,
  );
  TestValidator.equals(
    "subtotal",
    shipmentItem.orderItem.subtotal,
    2 * variantPrice,
  );
  TestValidator.equals("status", shipmentItem.orderItem.status, "shipped");
  // 14. Assertions - snapshot details
  TestValidator.equals(
    "snapshot product name",
    shipmentItem.snapshot.productName,
    productName,
  );
  TestValidator.equals(
    "snapshot product description",
    shipmentItem.snapshot.productDescription,
    productDescription,
  );
  TestValidator.equals(
    "snapshot product base price",
    shipmentItem.snapshot.productBasePrice,
    productBasePrice,
  );
  TestValidator.equals(
    "snapshot variant sku",
    shipmentItem.snapshot.variantSku,
    variantSku,
  );
  TestValidator.equals(
    "snapshot variant price",
    shipmentItem.snapshot.variantPrice,
    variantPrice,
  );
  // 15. Assertions - seller snapshot details
  TestValidator.equals(
    "seller snapshot shop name",
    shipmentItem.sellerSnapshot.shop_name,
    sellerShopName,
  );
  TestValidator.predicate("seller snapshot created_at is valid", () => {
    const date = new Date(shipmentItem.sellerSnapshot.created_at);
    return date instanceof Date && !isNaN(date.getTime());
  });
}
