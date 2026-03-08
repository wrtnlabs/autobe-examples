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
 * Test that a customer can successfully retrieve their session history.
 *
 * This test validates:
 * 1. Customer authentication via join creates a session
 * 2. Session list API returns valid paginated data
 * 3. Pagination metadata is correct
 * 4. Sessions are sorted by created_at descending
 * 5. Session timestamps are valid (24-hour max duration)
 */
export async function test_api_customer_sessions_list_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authResult);
  // 2. Retrieve session list
  const sessionsResponse =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(sessionsResponse);
  // 3. Verify pagination metadata is valid
  TestValidator.predicate(
    "pagination current is non-negative",
    sessionsResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    sessionsResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    sessionsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    sessionsResponse.pagination.pages >= 0,
  );
  // 4. Verify at least one session exists (the current login session)
  TestValidator.predicate(
    "at least one session exists",
    sessionsResponse.data.length >= 1,
  );
  // 5. Verify sessions are sorted by created_at descending (newest first)
  for (let i = 0; i < sessionsResponse.data.length - 1; i++) {
    const currentCreatedAt = new Date(
      sessionsResponse.data[i].created_at,
    ).getTime();
    const nextCreatedAt = new Date(
      sessionsResponse.data[i + 1].created_at,
    ).getTime();
    TestValidator.predicate(
      "sessions sorted by created_at descending",
      currentCreatedAt >= nextCreatedAt,
    );
  }
  // 6. Verify each session's timestamps are valid
  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;
  for (const session of sessionsResponse.data) {
    const createdAt = new Date(session.created_at).getTime();
    const expiredAt = new Date(session.expired_at).getTime();
    // Verify created_at is not in the future
    TestValidator.predicate(
      "created_at is not in the future",
      createdAt <= now,
    );
    // Verify expired_at is after created_at
    TestValidator.predicate(
      "expired_at is after created_at",
      expiredAt > createdAt,
    );
    // Verify session duration is at most 24 hours
    TestValidator.predicate(
      "session duration is at most 24 hours",
      expiredAt - createdAt <= twentyFourHours,
    );
  }
}
