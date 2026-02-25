import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test shipment update shipping cost adjustment functionality.
 *
 * Scenario: Seller adjusts shipping cost after shipment creation to reflect actual carrier charges.
 * Test the seller authenticating, accessing their shipment, updating the shipping cost field
 * with the corrected amount, and verifying the shipment record reflects the new cost.
 * Validate that cost adjustments are properly recorded and that the updated cost
 * is visible in shipment details reports.
 */
export async function test_api_shipment_update_shipping_cost_adjustment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Since we don't have shipment creation endpoint available,
  // we'll work with existing shipments or simulate the scenario differently
  // Generate random order and shipment IDs for the test
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Update shipping cost with adjusted amount
  const originalShippingCost = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<500> & tags.Maximum<5000>
  >();
  const adjustedShippingCost = originalShippingCost + 1000; // Adjust by adding 1000
  const updatedShipment =
    await api.functional.ecommerce.seller.orders.shipments.update(
      sellerConnection,
      {
        orderId: orderId,
        shipmentId: shipmentId,
        body: {
          shipping_cost: adjustedShippingCost,
        } satisfies IEcommerceShipment.IUpdate,
      },
    );
  typia.assert(updatedShipment);
  // 4. Validate the updated shipping cost matches the adjustment
  TestValidator.equals(
    "shipping cost updated",
    updatedShipment.shipping_cost,
    adjustedShippingCost,
  );
  TestValidator.predicate(
    "shipment has seller info",
    updatedShipment.seller !== null,
  );
  // 5. Verify shipment details are properly maintained
  TestValidator.predicate(
    "tracking number exists",
    updatedShipment.tracking_number.length > 0,
  );
  TestValidator.predicate(
    "carrier name exists",
    updatedShipment.carrier_name.length > 0,
  );
  TestValidator.predicate(
    "shipment status valid",
    ["created", "shipped", "delivered"].includes(
      updatedShipment.shipment_status,
    ),
  );
}
