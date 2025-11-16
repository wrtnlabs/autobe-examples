import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSession";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

/**
 * Validate advanced session listing, filtering and security for seller session
 * management API.
 *
 * 1. Register a new seller and authenticate to obtain a valid token and session.
 * 2. List sessions with no filters and collect at least one real session's values
 *    (including its IP, created_at).
 * 3. Re-issue new sessions by registering another seller account (to test
 *    isolation) and ensuring isolation.
 * 4. Use session filtering by IP, created_at range, and expired status. Confirm
 *    only matching sessions are listed.
 * 5. Attempt to list sessions with unauthorized user and confirm
 *    forbidden/unauthorized error is raised.
 */
export async function test_api_seller_session_list_filtering_and_security(
  connection: api.IConnection,
) {
  // 1. Register a new seller and obtain their information
  const sellerCreateRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    business_name: RandomGenerator.name(2),
    registration_number: RandomGenerator.alphaNumeric(10),
    business_phone: RandomGenerator.mobile(),
    href: "https://www.example.com/dashboard",
    referrer: "https://www.example.com/",
    ip: "127.0.0.1",
  } satisfies IShoppingMallSeller.ICreate;
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateRequest,
    });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;

  // 2. List sessions for this seller, no filters
  const pageAll: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.seller.sellers.sessions.index(
      connection,
      {
        sellerId: sellerId,
        body: {},
      },
    );
  typia.assert(pageAll);
  TestValidator.predicate(
    "at least one session exists after seller join",
    pageAll.data.length > 0,
  );
  // Extract a real session entry for filtering
  const session = pageAll.data[0];

  // 3. Filtering by IP
  const ipFilterBody = {
    ip: session.ip,
  } satisfies IShoppingMallSellerSession.IRequest;
  const pageByIp =
    await api.functional.shoppingMall.seller.sellers.sessions.index(
      connection,
      { sellerId: sellerId, body: ipFilterBody },
    );
  typia.assert(pageByIp);
  for (const row of pageByIp.data)
    TestValidator.equals("session ip matches filter", row.ip, session.ip);

  // 4. Filtering by created_at range
  const startAt = session.created_at;
  // Add 1 ms to simulate exclusive upper bound
  const endAt = new Date(
    new Date(session.created_at).getTime() + 1,
  ).toISOString();
  const dateRangeBody = {
    start_at: startAt,
    end_at: endAt,
  } satisfies IShoppingMallSellerSession.IRequest;
  const pageByTime =
    await api.functional.shoppingMall.seller.sellers.sessions.index(
      connection,
      { sellerId: sellerId, body: dateRangeBody },
    );
  typia.assert(pageByTime);
  TestValidator.predicate(
    "all returned sessions are within start_at and end_at",
    pageByTime.data.every(
      (row) => row.created_at >= startAt && row.created_at < endAt,
    ),
  );

  // 5. Filtering by expired status (may not exist, but exercise the filter)
  const expiredBody = {
    expired: false,
  } satisfies IShoppingMallSellerSession.IRequest;
  const pageActive =
    await api.functional.shoppingMall.seller.sellers.sessions.index(
      connection,
      { sellerId: sellerId, body: expiredBody },
    );
  typia.assert(pageActive);
  TestValidator.predicate(
    "all returned sessions have not expired",
    pageActive.data.every(
      (row) => row.expired_at == null || row.expired_at === undefined,
    ),
  );

  // 6. Re-issue another seller (for unauthorized test)
  const otherSeller = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      business_name: RandomGenerator.name(2),
      registration_number: RandomGenerator.alphaNumeric(10),
      business_phone: RandomGenerator.mobile(),
      href: "https://www.example.com/dashboard",
      referrer: "https://www.example.com/",
      ip: "127.0.0.2",
    },
  });
  typia.assert(otherSeller);

  // Switch to other seller authentication
  // Attempt to list sessions of the first seller, expect forbidden error
  await TestValidator.error(
    "other seller forbidden from viewing first seller's sessions",
    async () => {
      await api.functional.shoppingMall.seller.sellers.sessions.index(
        connection,
        { sellerId: sellerId, body: {} },
      );
    },
  );

  // 7. Attempt with unauthenticated connection, expect error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access forbidden", async () => {
    await api.functional.shoppingMall.seller.sellers.sessions.index(
      unauthConn,
      { sellerId: sellerId, body: {} },
    );
  });
}
