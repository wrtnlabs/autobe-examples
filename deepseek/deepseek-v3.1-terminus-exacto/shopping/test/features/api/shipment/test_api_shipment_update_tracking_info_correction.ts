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

export async function test_api_shipment_update_tracking_info_correction(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // Generate test data for existing shipment that needs correction
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  // Correct the tracking information with proper carrier details
  const correctTrackingNumber = RandomGenerator.alphaNumeric(20);
  const correctCarrierName = "FedEx Express";
  const updateBody = {
    tracking_number: correctTrackingNumber,
    carrier_name: correctCarrierName,
  } satisfies IEcommerceShipment.IUpdate;
  // Update the shipment with corrected tracking info
  // Assuming the shipment already exists and belongs to this seller
  const updatedShipment =
    await api.functional.ecommerce.seller.orders.shipments.update(
      sellerConnection,
      {
        orderId: orderId,
        shipmentId: shipmentId,
        body: updateBody,
      },
    );
  typia.assert(updatedShipment);
  // Validate that the shipment record contains the corrected information
  TestValidator.equals(
    "tracking number corrected",
    updatedShipment.tracking_number,
    correctTrackingNumber,
  );
  TestValidator.equals(
    "carrier name corrected",
    updatedShipment.carrier_name,
    correctCarrierName,
  );
  // Validate that seller information is preserved
  TestValidator.equals(
    "seller ID preserved",
    updatedShipment.seller.id,
    sellerAuth.id,
  );
  // Validate shipment entity structure
  TestValidator.predicate(
    "shipment has valid ID",
    updatedShipment.id === shipmentId,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    updatedShipment.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    updatedShipment.updated_at !== null,
  );
}
