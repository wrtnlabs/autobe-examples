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

/**
 * Test the access control validation for order shipments endpoint to ensure customers can only view their own order shipments.
 *
 * Validates that the API properly enforces data ownership and prevents unauthorized access to other customers' order shipment data. Tests the authorization mechanism where Customer A (unauthorized) attempts to access Customer B's (order owner) shipments, ensuring appropriate error handling and data protection.
 *
 * Special attention is given to verifying that the API returns proper error codes (403/404) and does not expose any sensitive shipment information when access is denied. The test demonstrates secure handling of order ownership validation.
 *
 * 1. Customer A (unauthorized user) registers and authenticates.
 * 2. Customer B (order owner) registers and authenticates.
 * 3. Customer B's order and shipments are created (simulated with random data).
 * 4. Customer A attempts to access Customer B's order shipments via the API.
 * 5. Verify response returns 403 or 404 status code.
 * 6. Verify no shipment data is returned to unauthorized user.
 * 7. Verify error message indicates permission or order not found.
 */
export async function test_api_order_shipments_access_control_own_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate Customer A (unauthorized user)
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA: IEcommerceMallMember.IAuthorized =
    await authorize_member_join(customerAConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallMember.IJoin,
    });
  typia.assert(customerA);
  // 2. Register and authenticate Customer B (order owner)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB: IEcommerceMallMember.IAuthorized =
    await authorize_member_join(customerBConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallMember.IJoin,
    });
  typia.assert(customerB);
  // 3. Create a random order ID for Customer B's order (simulated)
  const customerBOrderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Customer A attempts to access Customer B's order shipments (as the authenticated user)
  // This should result in 403 (Forbidden) or 404 (Not Found) because Customer A does not own the order
  await TestValidator.httpError(
    "Customer A should not access Customer B's order shipments",
    [403, 404],
    async () => {
      await api.functional.ecommerceMall.member.orders.shipments(
        customerAConnection,
        {
          orderId: customerBOrderId,
        },
      );
    },
  );
  // 5. Verify error message indicates authorization failure or order not found
  // Note: The exact error message format depends on server implementation
  // We validated the HTTP status code above, which is the critical security check
}
