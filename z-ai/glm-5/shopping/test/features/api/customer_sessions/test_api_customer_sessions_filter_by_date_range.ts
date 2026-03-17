import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import type { IShoppingMallActor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActor";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sessions_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create multiple customers to generate sessions at different times
  const customerConnections: api.IConnection[] = [];
  for (let i = 0; i < 3; i++) {
    const customerConnection: api.IConnection = { host: connection.host };
    await authorize_customer_join(customerConnection, {});
    customerConnections.push(customerConnection);
  }
  // Get the first customer's connection for querying sessions
  const queryConnection = customerConnections[0];
  // First, get all sessions without filter to see available data
  const allSessions = await api.functional.shoppingMall.customer.sessions.index(
    queryConnection,
    {
      body: {
        actor_type: "customer",
        limit: 100,
      } satisfies IShoppingMallCustomerSession.IRequest,
    },
  );
  typia.assert(allSessions);
  // Ensure we have sessions to test with
  TestValidator.predicate("should have sessions", allSessions.data.length >= 3);
  // Sort sessions by created_at for easier testing
  const sortedSessions = [...allSessions.data].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const oldestSession = sortedSessions[0];
  const newestSession = sortedSessions[sortedSessions.length - 1];
  // Test 1: Filter by created_at range - should return only sessions within range
  const midPoint = new Date(
    (new Date(oldestSession.created_at).getTime() +
      new Date(newestSession.created_at).getTime()) /
      2,
  );
  const filteredByCreatedAt =
    await api.functional.shoppingMall.customer.sessions.index(queryConnection, {
      body: {
        actor_type: "customer",
        created_at_start: oldestSession.created_at,
        created_at_end: midPoint.toISOString(),
        limit: 100,
      } satisfies IShoppingMallCustomerSession.IRequest,
    });
  typia.assert(filteredByCreatedAt);
  // Verify all returned sessions are within the date range
  for (const session of filteredByCreatedAt.data) {
    const createdAt = new Date(session.created_at);
    TestValidator.predicate(
      "created_at within range",
      createdAt >= new Date(oldestSession.created_at) && createdAt <= midPoint,
    );
  }
  // Test 2: Verify sessions outside the range are excluded
  const outsideRangeSession = sortedSessions.find(
    (s) => new Date(s.created_at) > midPoint,
  );
  if (outsideRangeSession !== undefined) {
    const notInFiltered = !filteredByCreatedAt.data.some(
      (s) => s.id === outsideRangeSession.id,
    );
    TestValidator.predicate("outside range session excluded", notInFiltered);
  }
  // Test 3: Filter by expired_at range
  const now = new Date();
  const farFuture = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
  const filteredByExpiredAt =
    await api.functional.shoppingMall.customer.sessions.index(queryConnection, {
      body: {
        actor_type: "customer",
        expired_at_start: now.toISOString(),
        expired_at_end: farFuture.toISOString(),
        limit: 100,
      } satisfies IShoppingMallCustomerSession.IRequest,
    });
  typia.assert(filteredByExpiredAt);
  // Verify all returned sessions have expired_at within range
  for (const session of filteredByExpiredAt.data) {
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      "expired_at within range",
      expiredAt >= now && expiredAt <= farFuture,
    );
  }
  // Test 4: Combined filters - both created_at and expired_at ranges
  const combinedFiltered =
    await api.functional.shoppingMall.customer.sessions.index(queryConnection, {
      body: {
        actor_type: "customer",
        created_at_start: oldestSession.created_at,
        created_at_end: newestSession.created_at,
        expired_at_start: now.toISOString(),
        expired_at_end: farFuture.toISOString(),
        limit: 100,
      } satisfies IShoppingMallCustomerSession.IRequest,
    });
  typia.assert(combinedFiltered);
  // Verify all returned sessions satisfy both filters
  for (const session of combinedFiltered.data) {
    const createdAt = new Date(session.created_at);
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      "created_at in combined range",
      createdAt >= new Date(oldestSession.created_at) &&
        createdAt <= new Date(newestSession.created_at),
    );
    TestValidator.predicate(
      "expired_at in combined range",
      expiredAt >= now && expiredAt <= farFuture,
    );
  }
  // Test 5: Verify is_expired and is_active derived fields
  const allSessionsForDerived =
    await api.functional.shoppingMall.customer.sessions.index(queryConnection, {
      body: {
        actor_type: "customer",
        limit: 100,
      } satisfies IShoppingMallCustomerSession.IRequest,
    });
  typia.assert(allSessionsForDerived);
  const checkTime = new Date();
  for (const session of allSessionsForDerived.data) {
    const expiredAt = new Date(session.expired_at);
    const expectedIsExpired = checkTime > expiredAt;
    const expectedIsActive = checkTime <= expiredAt;
    TestValidator.equals(
      "is_expired correct",
      session.is_expired,
      expectedIsExpired,
    );
    TestValidator.equals(
      "is_active correct",
      session.is_active,
      expectedIsActive,
    );
  }
  // Test 6: Verify date range boundaries are inclusive
  // Query with exact timestamps from existing sessions
  const boundaryFiltered =
    await api.functional.shoppingMall.customer.sessions.index(queryConnection, {
      body: {
        actor_type: "customer",
        created_at_start: oldestSession.created_at,
        created_at_end: newestSession.created_at,
        limit: 100,
      } satisfies IShoppingMallCustomerSession.IRequest,
    });
  typia.assert(boundaryFiltered);
  // Both boundary sessions should be included (inclusive)
  const hasOldest = boundaryFiltered.data.some(
    (s) => s.id === oldestSession.id,
  );
  const hasNewest = boundaryFiltered.data.some(
    (s) => s.id === newestSession.id,
  );
  TestValidator.predicate(
    "oldest session included (inclusive start)",
    hasOldest,
  );
  TestValidator.predicate("newest session included (inclusive end)", hasNewest);
}
