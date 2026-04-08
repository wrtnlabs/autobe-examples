import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Retrieve an administrator shipment detail payload by shipment UUID.
 *
 * Validates that an authenticated administrator can load a shipment detail
 * response and that the returned payload preserves the shipment header fields
 * exposed by the DTO, including seller and order summaries, tracking metadata,
 * lifecycle timestamps, and soft-delete state.
 *
 * The test follows the administrator-only access path, uses an isolated
 * authenticated connection, and verifies the response remains type-safe for the
 * full shipment detail payload defined by the API contract.
 *
 * 1. Register an administrator and authenticate with an isolated connection.
 * 2. Retrieve a shipment by UUID through the administrator shipment detail API.
 * 3. Validate the returned shipment payload against the shipment DTO.
 */
export async function test_api_shipment_admin_detail_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const shipment = await api.functional.mallPlatform.administrator.shipments.at(
    adminConnection,
    {
      shipmentId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(shipment);
  typia.assert(shipment.seller);
  typia.assert(shipment.order);
  TestValidator.predicate(
    "shipment id should be a UUID-like value",
    shipment.id.length > 0,
  );
  TestValidator.predicate(
    "carrier name should be present",
    shipment.carrierName.length > 0,
  );
  TestValidator.predicate(
    "tracking number should be present",
    shipment.trackingNumber.length > 0,
  );
  TestValidator.predicate(
    "createdAt should not be later than updatedAt",
    new Date(shipment.createdAt).getTime() <=
      new Date(shipment.updatedAt).getTime(),
  );
  if (shipment.trackingUrl !== null) {
    TestValidator.predicate(
      "trackingUrl should use an absolute URL scheme when present",
      shipment.trackingUrl.startsWith("http://") ||
        shipment.trackingUrl.startsWith("https://"),
    );
  }
  if (shipment.shippedAt !== null) {
    TestValidator.predicate(
      "shippedAt should be a valid timestamp when present",
      !Number.isNaN(new Date(shipment.shippedAt).getTime()),
    );
  }
  if (shipment.deliveredAt !== null) {
    TestValidator.predicate(
      "deliveredAt should be a valid timestamp when present",
      !Number.isNaN(new Date(shipment.deliveredAt).getTime()),
    );
  }
  TestValidator.equals(
    "deletedAt should be preserved as nullable",
    shipment.deletedAt,
    shipment.deletedAt,
  );
}
