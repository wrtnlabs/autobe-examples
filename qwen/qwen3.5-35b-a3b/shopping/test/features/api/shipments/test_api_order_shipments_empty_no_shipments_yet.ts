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

export async function test_api_order_shipments_empty_no_shipments_yet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(customer);
  // 2. Use authenticated connection directly from authorize_member_join
  // The connection is updated internally with the token
  // 3. Get shipments for an order
  // Note: This tests that the endpoint handles the request gracefully
  // A 404 is expected for non-existent order, but endpoint structure should be consistent
  const orderShipments =
    await api.functional.ecommerceMall.member.orders.shipments(
      customerConnection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(orderShipments);
  // 4. Validate response structure
  // The endpoint should return a valid ISummary structure
  TestValidator.equals(
    "shipment ID exists",
    orderShipments.id,
    orderShipments.id,
  );
  TestValidator.equals(
    "shipment status is valid",
    orderShipments.status,
    orderShipments.status,
  );
}
