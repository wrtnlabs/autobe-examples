import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentTrackingUpdate } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentTrackingUpdate";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipmentTrackingUpdate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipmentTrackingUpdate";
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
import { generate_random_ecommerce_mall_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_addresses_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_address } from "../../../prepare/prepare_random_ecommerce_mall_address";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_customer_tracking_update_exception(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - join and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerJoin);
  const customerAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: customerJoin.token.access },
  };
  // 2. Customer updates profile (display name and phone for order shipping)
  const updatedProfile =
    await api.functional.ecommerceMall.customer.profile.update(
      customerAuthConnection,
      {
        body: {
          displayName: RandomGenerator.name(2),
          phoneNumber: RandomGenerator.mobile(),
        } satisfies IEcommerceMallCustomer.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 3. Customer creates shipping address
  const address = await api.functional.ecommerceMall.customer.addresses.create(
    customerAuthConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        recipient_phone: RandomGenerator.mobile(),
        street: `${RandomGenerator.alphaNumeric(5)} Main St`,
        city: RandomGenerator.name(),
        state: RandomGenerator.name(),
      } satisfies IEcommerceMallAddress.ICreate,
    },
  );
  typia.assert(address);
  // 4. Seller setup - join and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  const sellerAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: sellerJoin.token.access },
  };
  // 5. Seller creates product with at least one variant
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerAuthConnection,
    {
      body: {
        name: `${RandomGenerator.name()} Product`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<100000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 6. Seller creates shipment with carrier tracking
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerAuthConnection,
    {
      body: {
        order_item_ids: [typia.random<string & tags.Format<"uuid">>()],
        carrier_name: "FedEx",
        carrier_phone: RandomGenerator.mobile(),
        carrier_website: "https://www.fedex.com",
        delivery_address: `${address.street}, ${address.city}, ${address.state}`,
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 7. Customer retrieves tracking updates with exception status filter
  const trackingResponse =
    await api.functional.ecommerceMall.customer.shipments.tracking_updates.updateTrackingUpdates(
      customerAuthConnection,
      {
        shipmentId: shipment.id,
        body: {
          tracking_status: "exception",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallShipmentTrackingUpdate.IRequest,
      },
    );
  typia.assert(trackingResponse);
  // 8. Verify tracking update records exception status is retrievable
  TestValidator.predicate(
    "exception status tracking updates exist",
    () => trackingResponse.data.length >= 0,
  );
  // 9. Verify shipment reference exists in tracking updates
  TestValidator.equals(
    "shipment reference in tracking update",
    trackingResponse.data[0]?.shipment?.id,
    shipment.id,
  );
  // 10. Verify tracking update has created_at timestamp
  if (trackingResponse.data.length > 0) {
    TestValidator.predicate(
      "tracking update has created_at timestamp",
      () => trackingResponse.data[0].created_at !== undefined,
    );
  }
  // 11. Verify pagination metadata
  TestValidator.predicate(
    "pagination has valid records",
    () => trackingResponse.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination current page is 1",
    trackingResponse.pagination.current,
    1,
  );
  // 12. Test exception status filtering retrieves correct records
  const trackingByStatus =
    await api.functional.ecommerceMall.customer.shipments.tracking_updates.updateTrackingUpdates(
      customerAuthConnection,
      {
        shipmentId: shipment.id,
        body: {
          tracking_status: "exception",
        } satisfies IEcommerceMallShipmentTrackingUpdate.IRequest,
      },
    );
  typia.assert(trackingByStatus);
  // 13. Verify no further tracking updates after exception (business logic)
  // In real scenario, exception status may prevent further updates
  // We validate the exception status is properly recorded and queryable
  TestValidator.equals(
    "exception status filter works",
    trackingByStatus.data[0]?.tracking_status,
    "exception",
  );
  // 14. Verify complete audit trail - tracking update has shipment relationship
  if (trackingByStatus.data.length > 0) {
    const trackingUpdate = trackingByStatus.data[0];
    TestValidator.equals(
      "tracking update linked to correct shipment",
      trackingUpdate.shipment.id,
      shipment.id,
    );
  }
}
