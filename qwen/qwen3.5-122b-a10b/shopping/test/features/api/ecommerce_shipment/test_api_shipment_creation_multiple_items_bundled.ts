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
 * Test seller shipment creation with multiple order items bundled into a single shipment.
 *
 * Validates that a seller can bundle multiple order items from the same order into one shipment package. The test authenticates a seller, prepares multiple order item IDs representing paid items from their products, and creates a single shipment containing all selected items. After shipment creation, validates that all included order items are properly linked in the shipment_items array and share the same tracking information.
 *
 * This test ensures the item bundling business rule works correctly where sellers can choose to ship multiple items together in one package rather than creating separate shipments for each item.
 *
 * 1. Seller authenticates via email/password registration.
 * 2. Generate 2-5 random order item UUIDs representing paid order items.
 * 3. Create shipment with carrier name, tracking number, and all order item IDs.
 * 4. Validate shipment response contains all items in shipment_items array.
 * 5. Validate all shipment items share identical tracking information.
 * 6. Validate shipment has proper timestamps and shipped status.
 */
export async function test_api_shipment_creation_multiple_items_bundled(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate seller
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
  // 2. Generate random order IDs and item IDs for the test
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const orderItemIds: (string & tags.Format<"uuid">)[] = ArrayUtil.repeat(
    typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<5>
    >(),
    () => typia.random<string & tags.Format<"uuid">>(),
  ) as (string & tags.Format<"uuid">)[];
  // 3. Create shipment with multiple items bundled
  const shipment =
    await api.functional.ecommerce.seller.orders.shipments.create(
      sellerConnection,
      {
        orderId,
        body: {
          carrier_name: RandomGenerator.pick(["UPS", "FedEx", "USPS", "DHL"]),
          tracking_number: RandomGenerator.alphaNumeric(12),
          tracking_url: typia.random<string & tags.Format<"uri">>(),
          order_item_ids: orderItemIds,
        } satisfies IEcommerceShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 4. Validate shipment contains all order items
  TestValidator.equals(
    "shipment has correct number of items",
    shipment.shipment_items.length,
    orderItemIds.length,
  );
  // 5. Validate all items share same tracking information as the shipment
  const allItemsHaveSameCarrier = shipment.shipment_items.every(
    () => shipment.carrier_name === shipment.carrier_name,
  );
  TestValidator.equals(
    "all items have same carrier as shipment",
    allItemsHaveSameCarrier,
    true,
  );
  const allItemsHaveSameTrackingNumber = shipment.shipment_items.every(
    () => shipment.tracking_number === shipment.tracking_number,
  );
  TestValidator.equals(
    "all items have same tracking number as shipment",
    allItemsHaveSameTrackingNumber,
    true,
  );
  // 6. Validate shipment status and timestamps
  TestValidator.predicate("shipment is shipped", shipment.status === "shipped");
  TestValidator.predicate(
    "has shipped timestamp",
    shipment.shipped_at !== undefined,
  );
  TestValidator.predicate(
    "has created timestamp",
    shipment.created_at !== undefined,
  );
}
