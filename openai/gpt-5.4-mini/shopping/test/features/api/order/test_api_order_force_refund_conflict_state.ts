import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import type { IMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_order_force_refund_conflict_state(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify that administrator force-refund rejects an order in a conflicting state.
   *
   * This test authenticates an administrator and then exercises the order force-refund
   * intervention endpoint with an order UUID that should not be eligible for a new
   * forced refund transition. It validates the service rejects the request with a
   * conflict-class HTTP error when the order cannot legally move into another forced
   * refund outcome.
   *
   * 1. Register and authenticate an administrator using the dedicated join utility.
   * 2. Call the force-refund endpoint for an ineligible order UUID.
   * 3. Assert the request fails with a conflict-class HTTP error.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = `${RandomGenerator.alphabets(8)}@example.com`;
  const adminPassword = RandomGenerator.alphaNumeric(12);
  await authorize_administrator_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const orderId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "administrator force-refund should reject conflicting order state",
    [409, 422],
    async () => {
      await api.functional.mallPlatform.administrator.orders.force_refund.create(
        adminConnection,
        { orderId },
      );
    },
  );
}
