import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallShipmentTrackingUpdate } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentTrackingUpdate";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_shipment_tracking_update_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(customer);
  // 2. Create new connection with customer token for authenticated requests
  const customerAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: customer.token.access,
    },
  };
  // 3. Generate valid UUIDs for shipment and tracking update
  const shipmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const trackingUpdateId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Retrieve tracking update
  const trackingUpdate: IEcommerceMallShipmentTrackingUpdate =
    await api.functional.ecommerceMall.customer.shipments.trackingUpdates.at(
      customerAuthConnection,
      {
        shipmentId,
        trackingUpdateId,
      },
    );
  typia.assert(trackingUpdate);
  // 5. Validate response fields
  TestValidator.equals(
    "tracking update id matches",
    trackingUpdate.id,
    trackingUpdateId,
  );
  TestValidator.equals(
    "shipment id matches",
    trackingUpdate.shipment_id,
    shipmentId,
  );
  TestValidator.predicate(
    "tracking status is valid",
    [
      "pending",
      "in_transit",
      "out_for_delivery",
      "delivered",
      "failed",
      "exception",
    ].includes(trackingUpdate.tracking_status),
  );
  TestValidator.equals(
    "created_at is date-time format",
    true,
    !isNaN(Date.parse(trackingUpdate.created_at)),
  );
  TestValidator.equals(
    "updated_at is date-time format",
    true,
    !isNaN(Date.parse(trackingUpdate.updated_at)),
  );
  TestValidator.equals(
    "deleted_at is null for active record",
    trackingUpdate.deleted_at,
    null,
  );
}