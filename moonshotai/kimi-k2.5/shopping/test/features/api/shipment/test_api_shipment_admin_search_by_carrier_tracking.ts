import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_shipment_admin_search_by_carrier_tracking(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const adminConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  const customerConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate as admin
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Authenticate as seller
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 3. Authenticate as customer
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 4. Create product as seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 5. Add product to customer cart (use first available variant)
  const variant = product.variants.find(
    (v: IEcommerceMallProductVariant) => v.stockQuantity > 0,
  );
  typia.assertGuard<IEcommerceMallProductVariant>(variant);
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 1,
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  // 6. Create order from cart
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
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 7. Get order item to create shipment
  const orderItem = typia.assert<IEcommerceMallOrderItem.ISummary>(
    order.orderItems[0],
  );
  // 8. Create shipment with specific carrier and tracking
  const carrierName = "FedEx Express";
  const trackingNumber = "TRACK123456789";
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderItemIds: [orderItem.id],
        carrierName: carrierName,
        trackingNumber: trackingNumber,
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 9. Admin searches shipments by carrier name (exact match)
  const searchByCarrier =
    await api.functional.ecommerceMall.admin.shipments.index(adminConnection, {
      body: {
        carrierName: carrierName,
        limit: 10,
      } satisfies IEcommerceMallShipment.IRequest,
    });
  typia.assert(searchByCarrier);
  TestValidator.predicate(
    "carrier search returns results",
    searchByCarrier.data.length > 0,
  );
  TestValidator.predicate(
    "all results match carrier filter",
    searchByCarrier.data.every((s: IEcommerceMallShipment.ISummary) =>
      s.carrierName.toLowerCase().includes(carrierName.toLowerCase()),
    ),
  );
  // 10. Admin searches by tracking number
  const searchByTracking =
    await api.functional.ecommerceMall.admin.shipments.index(adminConnection, {
      body: {
        trackingNumber: trackingNumber,
        limit: 10,
      } satisfies IEcommerceMallShipment.IRequest,
    });
  typia.assert(searchByTracking);
  TestValidator.predicate(
    "tracking search returns results",
    searchByTracking.data.length > 0,
  );
  TestValidator.predicate(
    "all results contain tracking number",
    searchByTracking.data.every((s: IEcommerceMallShipment.ISummary) =>
      s.trackingNumber.includes(trackingNumber),
    ),
  );
  // 11. Test partial carrier matching (substring "Express")
  const searchPartial =
    await api.functional.ecommerceMall.admin.shipments.index(adminConnection, {
      body: {
        carrierName: "Express",
        limit: 10,
      } satisfies IEcommerceMallShipment.IRequest,
    });
  typia.assert(searchPartial);
  TestValidator.predicate(
    "partial carrier search returns results",
    searchPartial.data.length > 0,
  );
  TestValidator.predicate(
    "partial search matches substring",
    searchPartial.data.every((s: IEcommerceMallShipment.ISummary) =>
      s.carrierName.toLowerCase().includes("express"),
    ),
  );
  // 12. Test search with no results
  const searchEmpty = await api.functional.ecommerceMall.admin.shipments.index(
    adminConnection,
    {
      body: {
        carrierName: "NonExistentCarrierXYZ123",
        limit: 10,
      } satisfies IEcommerceMallShipment.IRequest,
    },
  );
  typia.assert(searchEmpty);
  TestValidator.equals("empty search has no data", searchEmpty.data.length, 0);
  TestValidator.equals(
    "empty search has zero records",
    searchEmpty.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search has zero pages",
    searchEmpty.pagination.pages,
    0,
  );
  // 13. Verify pagination metadata
  TestValidator.equals(
    "pagination current is 1",
    searchByCarrier.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    searchByCarrier.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records is positive",
    searchByCarrier.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    searchByCarrier.pagination.pages > 0,
  );
}
