import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
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
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
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
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
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

export async function test_api_super_admin_force_cancel_order_skips_terminal_items(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdminAuth);
  // Step 2: Create seller connection and a product with 3 variants
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  const product = await api.functional.eCommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: null,
        base_price: 10000,
      } satisfies IECommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Create Variant A (Red)
  const variantA =
    await api.functional.eCommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: RandomGenerator.alphaNumeric(8),
          price: null,
          options: [
            { key: "color", value: "Red" },
          ] satisfies IECommerceMallProductVariant.IOption[],
        } satisfies IECommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variantA);
  // Create Variant B (Blue)
  const variantB =
    await api.functional.eCommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: RandomGenerator.alphaNumeric(8),
          price: null,
          options: [
            { key: "color", value: "Blue" },
          ] satisfies IECommerceMallProductVariant.IOption[],
        } satisfies IECommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variantB);
  // Create Variant C (Green)
  const variantC =
    await api.functional.eCommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: RandomGenerator.alphaNumeric(8),
          price: null,
          options: [
            { key: "color", value: "Green" },
          ] satisfies IECommerceMallProductVariant.IOption[],
        } satisfies IECommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variantC);
  // Restock all 3 variants with sufficient inventory
  await api.functional.eCommerceMall.seller.products.variants.inventory.create(
    sellerConnection,
    {
      productId: product.id,
      variantId: variantA.id,
      body: {
        quantity_change: 10,
        reason: "seller restock",
      } satisfies IECommerceMallInventoryRecord.ICreate,
    },
  );
  await api.functional.eCommerceMall.seller.products.variants.inventory.create(
    sellerConnection,
    {
      productId: product.id,
      variantId: variantB.id,
      body: {
        quantity_change: 10,
        reason: "seller restock",
      } satisfies IECommerceMallInventoryRecord.ICreate,
    },
  );
  await api.functional.eCommerceMall.seller.products.variants.inventory.create(
    sellerConnection,
    {
      productId: product.id,
      variantId: variantC.id,
      body: {
        quantity_change: 10,
        reason: "seller restock",
      } satisfies IECommerceMallInventoryRecord.ICreate,
    },
  );
  // Step 3: Create customer connection, address, cart items, and order
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  const address = await api.functional.eCommerceMall.customer.addresses.create(
    customerConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        street_address: "123 Main Street",
        city: "Seoul",
        state_province: "Seoul",
        postal_code: "12345",
        country: "South Korea",
        is_default: true,
      } satisfies IECommerceMallCustomerAddress.ICreate,
    },
  );
  typia.assert(address);
  // Add all 3 variants to cart
  await api.functional.eCommerceMall.customer.cart_items.create(
    customerConnection,
    {
      body: {
        product_variant_id: variantA.id,
        quantity: 1,
      } satisfies IECommerceMallCartItem.ICreate,
    },
  );
  await api.functional.eCommerceMall.customer.cart_items.create(
    customerConnection,
    {
      body: {
        product_variant_id: variantB.id,
        quantity: 1,
      } satisfies IECommerceMallCartItem.ICreate,
    },
  );
  await api.functional.eCommerceMall.customer.cart_items.create(
    customerConnection,
    {
      body: {
        product_variant_id: variantC.id,
        quantity: 1,
      } satisfies IECommerceMallCartItem.ICreate,
    },
  );
  // Place the order
  const order = await api.functional.eCommerceMall.customer.orders.create(
    customerConnection,
    {
      body: {
        addressId: address.id,
      } satisfies IECommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  const orderItemA = order.orderItems.find(
    (item) => item.productVariant.id === variantA.id,
  )!;
  const orderItemB = order.orderItems.find(
    (item) => item.productVariant.id === variantB.id,
  )!;
  const orderItemC = order.orderItems.find(
    (item) => item.productVariant.id === variantC.id,
  )!;
  // Step 4: Seller creates a shipment with Variant A and Variant B
  const shipment = await api.functional.eCommerceMall.seller.shipments.create(
    sellerConnection,
    {
      body: {
        carrierName: "Test Carrier",
        trackingNumber: RandomGenerator.alphaNumeric(12),
        orderItemIds: [orderItemA.id, orderItemB.id],
      } satisfies IECommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // Step 5: Customer confirms delivery for the shipment
  // Variant A and B become 'delivered' (terminal), Variant C remains 'paid'
  const confirmedShipment =
    await api.functional.eCommerceMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // Step 6: Super admin force-cancels the order
  const result =
    await api.functional.eCommerceMall.superAdministrator.orders.force_cancel.forceCancel(
      superAdminConnection,
      {
        orderCode: order.code,
      },
    );
  typia.assert(result);
  // Step 7: Validate results
  const resultItemA = result.orderItems.find(
    (item) => item.productVariant.id === variantA.id,
  )!;
  const resultItemB = result.orderItems.find(
    (item) => item.productVariant.id === variantB.id,
  )!;
  const resultItemC = result.orderItems.find(
    (item) => item.productVariant.id === variantC.id,
  )!;
  // Validation 1: Delivered items (A, B) are skipped - remain 'delivered'
  TestValidator.equals(
    "variant A remains delivered",
    resultItemA.status,
    "delivered",
  );
  TestValidator.equals(
    "variant B remains delivered",
    resultItemB.status,
    "delivered",
  );
  // Validation 2: Paid item (C) is force-cancelled to 'cancelled'
  TestValidator.equals(
    "variant C is cancelled",
    resultItemC.status,
    "cancelled",
  );
  // Validation 3: Variant C has a status log with reason 'administrator_force_cancel'
  const statusLogC = resultItemC.statusLogs.find(
    (log) => log.reason === "administrator_force_cancel",
  )!;
  TestValidator.equals(
    "variant C force-cancel status log from_status is paid",
    statusLogC.from_status,
    "paid",
  );
  TestValidator.equals(
    "variant C force-cancel status log to_status is cancelled",
    statusLogC.to_status,
    "cancelled",
  );
  // Validation 4: Delivered items (A, B) have no 'administrator_force_cancel' status log
  const hasForceCancelLogA = resultItemA.statusLogs.some(
    (log) => log.reason === "administrator_force_cancel",
  );
  TestValidator.predicate(
    "variant A has no force-cancel status log",
    !hasForceCancelLogA,
  );
  const hasForceCancelLogB = resultItemB.statusLogs.some(
    (log) => log.reason === "administrator_force_cancel",
  );
  TestValidator.predicate(
    "variant B has no force-cancel status log",
    !hasForceCancelLogB,
  );
}
