import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import type { IEcommerceShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipmentItem";
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
import { generate_random_ecommerce_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_seller_orders_shipments_create";
import { prepare_random_ecommerce_shipment } from "../../../prepare/prepare_random_ecommerce_shipment";

export async function test_api_shipment_tracking_viewing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Note: In a complete scenario, we would create an order with order items first.
  // Since order creation APIs are not available in the provided SDK functions,
  // this test focuses on the shipment viewing functionality assuming an order exists.
  // A production test would require: product creation → variant creation → cart operations → order placement
  const orderId = typia.random<string & tags.Format<"uuid">>();
  // 3. Seller creates a shipment with tracking information
  const shipment =
    await api.functional.ecommerce.seller.orders.shipments.create(
      sellerConnection,
      {
        orderId: orderId,
        body: {
          carrier_name: RandomGenerator.pick(["UPS", "FedEx", "USPS", "DHL"]),
          tracking_number: RandomGenerator.alphaNumeric(12),
          tracking_url: typia.random<string & tags.Format<"uri">>(),
          order_item_ids: [typia.random<string & tags.Format<"uuid">>()],
        } satisfies IEcommerceShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 4. Customer views the shipment tracking information
  const viewedShipment =
    await api.functional.ecommerce.customer.orders.shipments.at(
      customerConnection,
      {
        orderId: orderId,
        shipmentId: shipment.id,
      },
    );
  typia.assert(viewedShipment);
  // 5. Validate business logic - typia.assert() already validates all type constraints
  TestValidator.predicate(
    "shipment has valid status",
    viewedShipment.status.length > 0,
  );
  TestValidator.predicate(
    "shipment has shipped timestamp",
    viewedShipment.shipped_at !== null &&
      viewedShipment.shipped_at !== undefined,
  );
  TestValidator.predicate(
    "carrier name is set",
    viewedShipment.carrier_name.length > 0,
  );
  TestValidator.predicate(
    "tracking number is set",
    viewedShipment.tracking_number.length > 0,
  );
}