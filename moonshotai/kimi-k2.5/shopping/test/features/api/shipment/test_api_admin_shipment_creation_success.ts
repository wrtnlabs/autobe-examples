import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_shipments_create } from "../../../generate/generate_random_ecommerce_mall_admin_shipments_create";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test admin shipment creation success workflow.
 * 1. Authenticate as admin using authorize_admin_join
 * 2. Create shipment with paid order items using generate_random_ecommerce_mall_admin_shipments_create
 * 3. Validate shipment response includes complete tracking details and shipment items
 */
export async function test_api_admin_shipment_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Create isolated admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Create shipment using utility (handles preparation of valid order items)
  const shipment = await generate_random_ecommerce_mall_admin_shipments_create(
    adminConnection,
    {},
  );
  // Validate complete response structure
  typia.assert(shipment);
  // Validate business logic requirements
  TestValidator.predicate(
    "shipment has tracking number",
    shipment.tracking_number.length > 0,
  );
  TestValidator.predicate(
    "shipment has carrier name",
    shipment.carrier_name.length > 0,
  );
  TestValidator.predicate(
    "shipment has at least one shipment item",
    shipment.shipment_items.length > 0,
  );
  TestValidator.predicate(
    "shipment status is valid",
    shipment.status === "in_transit" || shipment.status === "delivered",
  );
  TestValidator.predicate(
    "shipment has valid seller",
    shipment.seller !== null && shipment.seller.id !== undefined,
  );
  // Validate shipment items contain order item details
  shipment.shipment_items.forEach((item, index) => {
    TestValidator.predicate(
      `shipment item ${index} has order item`,
      item.orderItem !== null && item.orderItem.id !== undefined,
    );
  });
}
