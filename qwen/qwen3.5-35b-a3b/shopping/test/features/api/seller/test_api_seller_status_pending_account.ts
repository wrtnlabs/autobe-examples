import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that a seller account with pending approval status can still access the platform status endpoint.
 * Validates that pending sellers can view platform health information without full selling privileges.
 */
export async function test_api_seller_status_pending_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account (automatically created with pending status)
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinOutput = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerJoinOutput);
  // 2. Create seller-specific connection and login with pending seller credentials
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerLoginOutput = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoinOutput.email,
      password: sellerPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(sellerLoginOutput);
  // 3. Call the platform status endpoint with the authenticated seller connection
  const status =
    await api.functional.ecommerceMall.seller.status(sellerConnection);
  typia.assert(status);
  // 4. Validate response contains all required status fields and platform is accessible
  TestValidator.equals(
    "platform status field exists",
    status.platformStatus !== undefined,
    true,
  );
  TestValidator.equals(
    "order counts field exists",
    status.orderCounts !== undefined,
    true,
  );
  TestValidator.equals(
    "shipment counts field exists",
    status.shipmentCounts !== undefined,
    true,
  );
  TestValidator.equals(
    "health score field exists",
    status.healthScore !== undefined,
    true,
  );
  // Validate health score is within expected range
  TestValidator.predicate(
    "health score is between 0 and 100",
    status.healthScore !== undefined &&
      status.healthScore >= 0 &&
      status.healthScore <= 100,
  );
  // Validate platform status is one of the allowed values
  TestValidator.predicate(
    "platform status is valid",
    status.platformStatus === "healthy" ||
      status.platformStatus === "degraded" ||
      status.platformStatus === "unhealthy",
  );
}
