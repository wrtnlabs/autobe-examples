import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSession";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that customers can only access their own session history,
 * ensuring complete security isolation between customer accounts.
 *
 * This test validates that:
 * 1. Each customer can only see their own sessions
 * 2. Session data is properly isolated by user_id
 * 3. No cross-customer session leakage occurs
 */
export async function test_api_customer_sessions_security_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first customer account and get their sessions
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1 = await authorize_customer_join(customer1Connection, {});
  typia.assert(customer1);
  const customer1Sessions =
    await api.functional.shoppingMall.customer.sessions.index(
      customer1Connection,
      { body: {} satisfies IShoppingMallSellerSession.IRequest },
    );
  typia.assert(customer1Sessions);
  const customer1SessionIds = customer1Sessions.data.map((s) => s.id);
  // Step 2: Create second customer account and get their sessions
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2 = await authorize_customer_join(customer2Connection, {});
  typia.assert(customer2);
  const customer2Sessions =
    await api.functional.shoppingMall.customer.sessions.index(
      customer2Connection,
      { body: {} satisfies IShoppingMallSellerSession.IRequest },
    );
  typia.assert(customer2Sessions);
  const customer2SessionIds = customer2Sessions.data.map((s) => s.id);
  // Step 3: Validate security isolation
  // Each customer should have at least one session (from registration)
  TestValidator.predicate(
    "customer 1 has at least one session",
    customer1SessionIds.length > 0,
  );
  TestValidator.predicate(
    "customer 2 has at least one session",
    customer2SessionIds.length > 0,
  );
  // No overlap: customer 2 should not see any of customer 1's sessions
  TestValidator.predicate(
    "customer 2 cannot see customer 1 sessions",
    customer1SessionIds.every((id) => !customer2SessionIds.includes(id)),
  );
  // No overlap: customer 1 should not see any of customer 2's sessions
  TestValidator.predicate(
    "customer 1 cannot see customer 2 sessions",
    customer2SessionIds.every((id) => !customer1SessionIds.includes(id)),
  );
  // Verify complete isolation: intersection should be empty
  const intersection = customer1SessionIds.filter((id) =>
    customer2SessionIds.includes(id),
  );
  TestValidator.equals(
    "no session ID overlap between customers",
    intersection.length,
    0,
  );
}
