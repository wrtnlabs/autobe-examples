import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_create";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { generate_random_ecommerce_mall_seller_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_variants_inventory_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test shipment isolation between sellers in a multi-seller order scenario.
 * Setup: Create two different approved sellers, each with products. Have a customer
 * place an order containing items from both sellers. Each seller creates their own
 * shipment for their respective order items. Execute the shipment query as first
 * seller and verify only their own shipments are returned, not the other seller's
 * shipments. This validates the 'Each seller can view and manage only the order
 * items for products they own' and 'Seller-Shipment Isolation' business rules.
 */
export async function test_api_seller_shipment_isolation_from_other_sellers(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {},
  });
  typia.assert(admin);
  // 2. Create first seller and approve
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(seller1Connection, {
    body: {},
  });
  typia.assert(seller1);
  await api.functional.ecommerceMall.admin.seller_registrations.update(
    adminConnection,
    {
      registrationId: seller1.id,
      body: {
        status: "approved",
        rejection_reason: null,
      },
    },
  );
  // 3. Create second seller and approve
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_join(seller2Connection, {
    body: {},
  });
  typia.assert(seller2);
  await api.functional.ecommerceMall.admin.seller_registrations.update(
    adminConnection,
    {
      registrationId: seller2.id,
      body: {
        status: "approved",
        rejection_reason: null,
      },
    },
  );
  // 4. Create category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {},
    },
  );
  typia.assert(category);
  // 5. First seller creates product, variant, and adds inventory
  const product1 = await generate_random_ecommerce_mall_seller_products_create(
    seller1Connection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product1);
  const variant1 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      seller1Connection,
      {
        params: { productId: product1.id },
        body: {},
      },
    );
  typia.assert(variant1);
  await generate_random_ecommerce_mall_seller_variants_inventory_create(
    seller1Connection,
    {
      params: { variantId: variant1.id },
      body: {
        quantity: 100,
        reason: "Initial stock",
      },
    },
  );
  // 6. Second seller creates product, variant, and adds inventory
  const product2 = await generate_random_ecommerce_mall_seller_products_create(
    seller2Connection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product2);
  const variant2 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      seller2Connection,
      {
        params: { productId: product2.id },
        body: {},
      },
    );
  typia.assert(variant2);
  await generate_random_ecommerce_mall_seller_variants_inventory_create(
    seller2Connection,
    {
      params: { variantId: variant2.id },
      body: {
        quantity: 100,
        reason: "Initial stock",
      },
    },
  );
  // 7. Create customer and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(customer);
  // 8. Customer adds items from both sellers to cart
  const cartItem1 = await generate_random_ecommerce_mall_customer_cart_create(
    customerConnection,
    {
      body: {
        productVariantId: variant1.id,
        quantity: 2,
      },
    },
  );
  typia.assert(cartItem1);
  const cartItem2 = await generate_random_ecommerce_mall_customer_cart_create(
    customerConnection,
    {
      body: {
        productVariantId: variant2.id,
        quantity: 3,
      },
    },
  );
  typia.assert(cartItem2);
  // 9. Customer creates multi-seller order
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: "Test Customer",
        recipientPhone: "01012345678",
        streetAddress: "123 Test Street",
        city: "Seoul",
        state: null,
        postalCode: "12345",
        country: "South Korea",
      },
    },
  );
  typia.assert(order);
  // Get order items for each seller using typia.assert to cast to expected shape
  type OrderItemWithSeller = IEcommerceMallOrderItem & {
    id: string & tags.Format<"uuid">;
    seller: { id: string & tags.Format<"uuid"> };
  };
  const orderItemsWithSeller = typia.assert<OrderItemWithSeller[]>(order.orderItems);
  const orderItemsSeller1 = orderItemsWithSeller.filter(
    (item) => item.seller.id === seller1.id,
  );
  const orderItemsSeller2 = orderItemsWithSeller.filter(
    (item) => item.seller.id === seller2.id,
  );
  TestValidator.equals(
    "seller 1 should have order items",
    orderItemsSeller1.length > 0,
    true,
  );
  TestValidator.equals(
    "seller 2 should have order items",
    orderItemsSeller2.length > 0,
    true,
  );
  // 10. First seller creates shipment for their items
  const shipment1 =
    await generate_random_ecommerce_mall_seller_shipments_create(
      seller1Connection,
      {
        body: {
          orderItemIds: orderItemsSeller1.map((item) => item.id),
          carrierName: "FedEx",
          trackingNumber: "FED1234567890",
        },
      },
    );
  typia.assert(shipment1);
  // 11. Second seller creates shipment for their items
  const shipment2 =
    await generate_random_ecommerce_mall_seller_shipments_create(
      seller2Connection,
      {
        body: {
          orderItemIds: orderItemsSeller2.map((item) => item.id),
          carrierName: "UPS",
          trackingNumber: "UPS9876543210",
        },
      },
    );
  typia.assert(shipment2);
  // 12. First seller queries shipments - should only see their own
  const seller1Shipments: IPageIEcommerceMallShipment.ISummary =
    await api.functional.ecommerceMall.seller.shipments.index(
      seller1Connection,
      {
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(seller1Shipments);
  // 13. Verify isolation - seller 1 should only see their shipments
  TestValidator.equals(
    "seller 1 should see their own shipments",
    seller1Shipments.data.some((s) => s.sellerId === seller1.id),
    true,
  );
  TestValidator.equals(
    "seller 1 should not see seller 2's shipments",
    seller1Shipments.data.some((s) => s.sellerId === seller2.id),
    false,
  );
  TestValidator.equals(
    "seller 1's shipment should have correct carrier",
    seller1Shipments.data[0]?.carrierName,
    "FedEx",
  );
  TestValidator.equals(
    "seller 1's shipment should have seller 1 summary",
    seller1Shipments.data[0]?.seller.id,
    seller1.id,
  );
  // 14. Second seller queries shipments - should only see their own
  const seller2Shipments: IPageIEcommerceMallShipment.ISummary =
    await api.functional.ecommerceMall.seller.shipments.index(
      seller2Connection,
      {
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(seller2Shipments);
  // 15. Verify isolation - seller 2 should only see their shipments
  TestValidator.equals(
    "seller 2 should see their own shipments",
    seller2Shipments.data.some((s) => s.sellerId === seller2.id),
    true,
  );
  TestValidator.equals(
    "seller 2 should not see seller 1's shipments",
    seller2Shipments.data.some((s) => s.sellerId === seller1.id),
    false,
  );
  TestValidator.equals(
    "seller 2's shipment should have correct carrier",
    seller2Shipments.data[0]?.carrierName,
    "UPS",
  );
}