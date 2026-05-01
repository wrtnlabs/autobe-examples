import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGuestSession";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test browsing all authentication session records across the platform without filters.
 *
 * Validates that the session browsing endpoint returns proper paginated results when queried with no filters. A customer authenticates via join (creating a fresh session record), then queries sessions with an empty request body to verify default pagination behavior and response structure.
 *
 * 1. Customer registers and authenticates via join, creating a new customer session.
 * 2. Customer queries sessions with an empty request body (no filters, default pagination).
 * 3. Validates pagination metadata: current page defaults to 1, limit defaults to 20, total records and pages are at least 1.
 * 4. Validates the customer's own session appears in the results with actorType "customer".
 * 5. Validates sessions are sorted by creation time with newest first.
 * 6. Validates each session record includes all required summary fields — full type validation performed by typia.assert.
 */
export async function test_api_session_browse_all_unfiltered(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Browse all sessions with no filters
  const result = await api.functional.shoppingMall.customer.sessions.index(
    customerConnection,
    {
      body: {} satisfies IShoppingMallGuestSession.IRequest,
    },
  );
  typia.assert(result);
  // 3. Validate pagination metadata
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals(
    "pagination limit defaults to 20",
    result.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "total records at least 1",
    result.pagination.records >= 1,
  );
  TestValidator.predicate(
    "total pages at least 1",
    result.pagination.pages >= 1,
  );
  // 4. Validate sessions exist
  TestValidator.predicate("data has sessions", result.data.length > 0);
  // 5. Validate the customer's own session is present
  const ownSession = result.data.find(
    (s) => s.actorId === customer.id && s.actorType === "customer",
  );
  TestValidator.predicate(
    "customer's own session found",
    ownSession !== undefined,
  );
  // 6. Validate sessions sorted by created_at descending (newest first)
  for (let i = 0; i < result.data.length - 1; i++) {
    const current = new Date(result.data[i].created_at).getTime();
    const next = new Date(result.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `session ${i} created_at >= session ${i + 1} created_at`,
      current >= next,
    );
  }
}
