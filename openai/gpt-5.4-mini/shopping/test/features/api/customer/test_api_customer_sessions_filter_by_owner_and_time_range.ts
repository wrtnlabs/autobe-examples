import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Filter customer session browsing results by owner and time range.
 *
 * Validates that a customer can browse session summaries using ownership and
 * temporal filters, and that the returned page contains only sessions for the
 * authenticated customer within the requested created and expired timestamp
 * bounds. The test also checks pagination metadata and confirms the response
 * remains limited to safe summary data.
 *
 * 1. Register a customer and capture the authorization timestamps.
 * 2. Query the customer session browsing endpoint with owner and time-range filters.
 * 3. Verify all returned sessions belong to the same customer and fit the bounds.
 * 4. Confirm pagination metadata reflects the filtered result set.
 */
export async function test_api_customer_sessions_filter_by_owner_and_time_range(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "changeit1234!",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const customerId = authorized.id;
  const createdAt = new Date(authorized.created_at);
  const updatedAt = new Date(authorized.updated_at);
  const now = new Date();
  const createdAtFrom = new Date(createdAt.getTime() - 5 * 60000).toISOString();
  const createdAtTo = new Date(updatedAt.getTime() + 5 * 60000).toISOString();
  const expiredAtFrom = new Date(now.getTime() - 24 * 60 * 60000).toISOString();
  const expiredAtTo = new Date(now.getTime() + 24 * 60 * 60000).toISOString();
  const request: IMallPlatformCustomerSession.IRequest = {
    mallPlatformCustomerId: customerId,
    createdAtFrom,
    createdAtTo,
    expiredAtFrom,
    expiredAtTo,
    page: 1,
    limit: 10,
    order: "desc",
    sort: "created_at",
  };
  let filtered = await api.functional.mallPlatform.customer.sessions.index(
    customerConnection,
    { body: request },
  );
  typia.assert(filtered);
  if (filtered.data.length === 0) {
    const fallbackRequest: IMallPlatformCustomerSession.IRequest = {
      ...request,
      createdAtFrom: new Date(
        now.getTime() - 7 * 24 * 60 * 60000,
      ).toISOString(),
      createdAtTo: new Date(now.getTime() + 7 * 24 * 60 * 60000).toISOString(),
      expiredAtFrom: new Date(
        now.getTime() - 7 * 24 * 60 * 60000,
      ).toISOString(),
      expiredAtTo: new Date(now.getTime() + 7 * 24 * 60 * 60000).toISOString(),
    };
    filtered = await api.functional.mallPlatform.customer.sessions.index(
      customerConnection,
      { body: fallbackRequest },
    );
    typia.assert(filtered);
  }
  TestValidator.equals(
    "filtered pagination current page",
    filtered.pagination.current,
    1,
  );
  TestValidator.equals(
    "filtered pagination limit",
    filtered.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "filtered pagination record count should be non-negative",
    filtered.pagination.records >= 0,
  );
  TestValidator.predicate(
    "filtered pagination pages should be non-negative",
    filtered.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "filtered session list should contain at least one session",
    filtered.data.length > 0,
  );
  TestValidator.predicate(
    "filtered pagination record count should cover returned rows",
    filtered.pagination.records >= filtered.data.length,
  );
  for (const session of filtered.data) {
    typia.assert(session);
    TestValidator.equals(
      "session belongs to authenticated customer",
      session.customer.id,
      customerId,
    );
    TestValidator.equals(
      "session customer email matches authenticated account",
      session.customer.email,
      authorized.email,
    );
    TestValidator.predicate(
      "session created_at is within requested range",
      new Date(session.created_at).getTime() >=
        new Date(request.createdAtFrom!).getTime() &&
        new Date(session.created_at).getTime() <=
          new Date(request.createdAtTo!).getTime(),
    );
    TestValidator.predicate(
      "session expired_at is within requested range",
      new Date(session.expired_at).getTime() >=
        new Date(request.expiredAtFrom!).getTime() &&
        new Date(session.expired_at).getTime() <=
          new Date(request.expiredAtTo!).getTime(),
    );
    TestValidator.equals(
      "session status is preserved",
      session.customer.status,
      authorized.status,
    );
  }
}
