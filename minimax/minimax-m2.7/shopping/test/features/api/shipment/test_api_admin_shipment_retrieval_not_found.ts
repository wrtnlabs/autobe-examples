import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
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

/**
 * Test that an administrator receives HTTP 404 Not Found when attempting to
 * retrieve a shipment that does not exist in the system.
 *
 * This test validates the error handling behavior of the shipment retrieval
 * endpoint for administrators. When an administrator attempts to access a
 * shipment with a non-existent UUID, the system should return a proper 404
 * error response, indicating the resource was not found.
 *
 * **Test Flow:**
 * 1. Register and authenticate as a new administrator account
 * 2. Generate a random UUID that does not correspond to any existing shipment
 * 3. Attempt to retrieve the shipment using the non-existent UUID
 * 4. Validate that the server returns HTTP 404 Not Found error
 *
 * **Security Note:** This ensures that invalid shipment IDs are properly
 * handled and don't leak information about existing shipments through
 * timing or error response differences.
 */
export async function test_api_admin_shipment_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Generate a non-existent UUID for shipment
  const nonExistentShipmentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the non-existent shipment and expect 404 error
  await TestValidator.httpError(
    "non-existent shipment returns 404",
    404,
    async () =>
      await api.functional.ecommerceMall.admin.admin.shipments.at(
        adminConnection,
        {
          shipmentId: nonExistentShipmentId,
        },
      ),
  );
}
