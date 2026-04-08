import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_order_shipments_multi_seller_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(customerConnection, {
    body: {
      email,
      password,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Fetch shipment for an order (test environment should have pre-seeded data)
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const shipment = await api.functional.ecommerceMall.member.orders.shipments(
    customerConnection,
    {
      orderId,
    },
  );
  typia.assert(shipment);
  // 3. Validate shipment structure and business rules
  // Validate shipment core fields
  TestValidator.notEquals("shipment id", shipment.id, null);
  TestValidator.predicate(
    "shipment status valid",
    ["shipped", "delivered"].includes(shipment.status),
  );
  TestValidator.notEquals("shipment created_at", shipment.created_at, null);
  // Validate seller attribution
  TestValidator.notEquals("shipment seller exists", shipment.seller, null);
  TestValidator.notEquals("shipment seller id", shipment.seller.id, null);
  TestValidator.notEquals(
    "shipment seller display_name",
    shipment.seller.display_name,
    null,
  );
  TestValidator.predicate(
    "shipment seller approval_status valid",
    ["pending", "approved", "rejected"].includes(
      shipment.seller.approval_status,
    ),
  );
  // Validate tracking information (optional fields)
  if (shipment.tracking_number) {
    TestValidator.notEquals(
      "shipment tracking_number",
      shipment.tracking_number,
      "",
    );
  }
  if (shipment.carrier) {
    TestValidator.notEquals("shipment carrier", shipment.carrier, "");
  }
  if (shipment.shipped_at) {
    TestValidator.notEquals("shipment shipped_at", shipment.shipped_at, "");
  }
  if (shipment.delivered_at) {
    TestValidator.notEquals("shipment delivered_at", shipment.delivered_at, "");
  }
}
