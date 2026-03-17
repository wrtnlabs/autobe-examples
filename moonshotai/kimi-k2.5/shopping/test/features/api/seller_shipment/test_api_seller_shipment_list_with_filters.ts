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
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
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
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_seller_shipment_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create connections for each actor
  const sellerConnection: api.IConnection = { host: connection.host };
  const adminConnection: api.IConnection = { host: connection.host };
  const customerConnection: api.IConnection = { host: connection.host };
  // 2. Authenticate seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    },
  });
  // 3. Authenticate admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 4. Submit seller registration
  const registration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      {
        body: {
          taxIdentificationNumber: RandomGenerator.alphaNumeric(10),
          businessRegistrationNumber: RandomGenerator.alphaNumeric(10),
          businessName: RandomGenerator.name(),
          businessAddress: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  // 5. Approve seller registration via admin
  await api.functional.ecommerceMall.admin.seller_registrations.update(
    adminConnection,
    {
      registrationId: (registration as any).id,
      body: {
        status: "approved",
        rejection_reason: null,
      },
    },
  );
  // 6. Authenticate customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    },
  });
  // 7. Admin creates category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        parentId: null,
      },
    },
  );
  // 8. Seller creates product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  // 9. Seller creates variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8),
          options: [
            { optionName: "Color", optionValue: "Red" },
            { optionName: "Size", optionValue: "Large" },
          ],
          price: typia.random<number & tags.Minimum<0>>(),
          stock: 100,
        },
      },
    );
  // 10. Add inventory
  await generate_random_ecommerce_mall_seller_variants_inventory_create(
    sellerConnection,
    {
      params: { variantId: variant.id },
      body: {
        quantity: 100,
        reason: "Initial stock",
      },
    },
  );
  // 11. Customer adds item to cart
  await generate_random_ecommerce_mall_customer_cart_create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 2,
      },
    },
  );
  // 12. Customer checkout to create order
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(),
        state: RandomGenerator.name(),
        postalCode: RandomGenerator.alphaNumeric(5),
        country: RandomGenerator.name(),
      },
    },
  );
  // 13. Get order item ID from created order
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 14. Create shipment for the order items
  const carrierName = "FedEx";
  const trackingNumber = RandomGenerator.alphaNumeric(12);
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderItemIds: [(orderItem as IEntity).id],
        carrierName: carrierName,
        trackingNumber: trackingNumber,
      },
    },
  );
  typia.assert(shipment);
  // 15. Test: Get all shipments (no filters)
  const allShipments =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {} satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(allShipments);
  TestValidator.predicate(
    "should return at least one shipment",
    allShipments.data.length >= 1,
  );
  TestValidator.predicate(
    "should contain created shipment",
    allShipments.data.some((s) => s.id === shipment.id),
  );
  // 16. Test: Filter by orderId
  const byOrderId = await api.functional.ecommerceMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        orderId: order.id,
      } satisfies IEcommerceMallShipment.IRequest,
    },
  );
  typia.assert(byOrderId);
  TestValidator.predicate(
    "should return shipments for specific order",
    byOrderId.data.every((s) => s.orderId === order.id),
  );
  TestValidator.predicate(
    "should include created shipment",
    byOrderId.data.some((s) => s.id === shipment.id),
  );
  // 17. Test: Filter by carrierName partial match
  const byCarrier = await api.functional.ecommerceMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        carrierName: "Fed",
      } satisfies IEcommerceMallShipment.IRequest,
    },
  );
  typia.assert(byCarrier);
  TestValidator.predicate(
    "should return shipments matching carrier name",
    byCarrier.data.every((s) => s.carrierName.includes("Fed")),
  );
  TestValidator.predicate(
    "should include created shipment",
    byCarrier.data.some((s) => s.id === shipment.id),
  );
  // 18. Test: Filter by trackingNumber
  const byTracking = await api.functional.ecommerceMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        trackingNumber: trackingNumber.substring(0, 6),
      } satisfies IEcommerceMallShipment.IRequest,
    },
  );
  typia.assert(byTracking);
  TestValidator.predicate(
    "should return shipments matching tracking number",
    byTracking.data.every((s) =>
      s.trackingNumber.includes(trackingNumber.substring(0, 6)),
    ),
  );
  TestValidator.predicate(
    "should include created shipment",
    byTracking.data.some((s) => s.id === shipment.id),
  );
  // 19. Verify shipment data structure
  const foundShipment = allShipments.data.find((s) => s.id === shipment.id)!;
  typia.assert(foundShipment);
  TestValidator.equals(
    "shipment carrier name matches",
    foundShipment.carrierName,
    carrierName,
  );
  TestValidator.equals(
    "shipment tracking number matches",
    foundShipment.trackingNumber,
    trackingNumber,
  );
  TestValidator.equals(
    "shipment sellerId matches",
    foundShipment.sellerId,
    (shipment as any).sellerId ?? shipment.seller.id,
  );
  TestValidator.equals(
    "shipment orderId matches",
    foundShipment.orderId,
    order.id,
  );
}