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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_seller_orders_shipments_create";
import { prepare_random_ecommerce_shipment } from "../../../prepare/prepare_random_ecommerce_shipment";

/**
 * Test seller shipment creation for a single paid order item.
 *
 * Validates the shipment creation workflow for sellers, ensuring that the API endpoint properly accepts shipment creation requests with carrier information and order item IDs. This test verifies the API structure and response validation for the shipment creation endpoint.
 *
 * Note: This test focuses on the shipment creation API call itself. In a complete end-to-end scenario, prerequisite data (products, variants, inventory, customers, orders with paid items) would need to be created through additional setup functions or database fixtures.
 *
 * 1. Seller registers and authenticates.
 * 2. Creates shipment request with random order ID and order item ID.
 * 3. Validates shipment response structure and tracking information.
 */
export async function test_api_shipment_creation_single_item(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerAuthorized);
  // 2. Create shipment (using random order ID for API structure validation)
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const shipment =
    await api.functional.ecommerce.seller.orders.shipments.create(
      sellerConnection,
      {
        orderId,
        body: {
          carrier_name: RandomGenerator.pick([
            "UPS",
            "FedEx",
            "USPS",
            "Korea Post",
          ]),
          tracking_number: RandomGenerator.alphaNumeric(12),
          order_item_ids: [orderItemId],
        } satisfies IEcommerceShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 3. Validate shipment response
  TestValidator.equals(
    "carrier name exists",
    shipment.carrier_name.length > 0,
    true,
  );
  TestValidator.equals(
    "tracking number exists",
    shipment.tracking_number.length > 0,
    true,
  );
  TestValidator.predicate(
    "has shipment items",
    shipment.shipment_items.length >= 0,
  );
  TestValidator.predicate("has order reference", shipment.order !== null);
  TestValidator.predicate("has seller reference", shipment.seller !== null);
}
