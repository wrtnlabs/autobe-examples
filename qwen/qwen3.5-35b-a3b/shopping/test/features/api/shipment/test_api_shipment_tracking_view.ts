import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_shipment_tracking_view(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // Step 2: Create a shipment for the customer to view
  const shipmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 3: Customer views the shipment tracking
  const shipment = await api.functional.ecommerceMall.member.shipments.at(
    customerConnection,
    { shipmentId },
  );
  typia.assert(shipment);
  // Step 4: Validate shipment structure
  TestValidator.equals("shipment ID matches", shipment.id, shipmentId);
  TestValidator.equals(
    "seller ID is present",
    shipment.seller_id,
    shipment.seller.id,
  );
  // Validate shipment status
  TestValidator.predicate(
    "status is valid",
    shipment.status === "shipped" || shipment.status === "delivered",
  );
  // Validate tracking information
  TestValidator.predicate("carrier is provided", shipment.carrier !== null);
  TestValidator.predicate(
    "tracking number is provided",
    shipment.tracking_number !== null,
  );
  // Validate timestamps
  TestValidator.predicate(
    "created_at is valid ISO format",
    shipment.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at is valid ISO format",
    shipment.updated_at !== null,
  );
  TestValidator.predicate(
    "shipped_at is populated",
    shipment.shipped_at !== null,
  );
  // delivered_at can be null if not yet delivered
  if (shipment.delivered_at !== null) {
    TestValidator.equals(
      "delivered_at is valid ISO format",
      shipment.delivered_at !== null,
      true,
    );
  }
  // Validate seller summary
  TestValidator.equals(
    "seller ID matches",
    shipment.seller.id,
    shipment.seller_id,
  );
  TestValidator.predicate(
    "seller name is present",
    shipment.seller.display_name !== null,
  );
  TestValidator.predicate(
    "seller approval status",
    shipment.seller.approval_status !== null,
  );
  // Validate shipment items
  TestValidator.predicate(
    "has shipment items",
    shipment.shipment_items.length > 0,
  );
  const firstItem = shipment.shipment_items[0];
  TestValidator.equals("item ID is present", firstItem.id, firstItem.id);
  TestValidator.equals(
    "item order ID is present",
    firstItem.orderItem.id,
    firstItem.orderItem.id,
  );
  TestValidator.predicate(
    "item quantity is positive",
    firstItem.quantity_shipped > 0,
  );
  TestValidator.predicate(
    "item status is valid",
    firstItem.status === "pending" ||
      firstItem.status === "shipped" ||
      firstItem.status === "delivered" ||
      firstItem.status === "cancelled",
  );
  TestValidator.predicate(
    "item created_at is valid",
    firstItem.created_at !== null,
  );
  TestValidator.predicate(
    "item updated_at is valid",
    firstItem.updated_at !== null,
  );
  TestValidator.equals(
    "item links to shipment",
    firstItem.shipment.id,
    shipment.id,
  );
}