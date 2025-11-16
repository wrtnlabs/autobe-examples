import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSecurityEvent";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSecurityEvent";

/**
 * Validate that a customer password change produces customer-scoped security
 * events retrievable via the customer securityEvents endpoint.
 *
 * Business flow:
 *
 * 1. A new customer self-registers via /auth/customer/join and becomes
 *    authenticated (IAuthorized payload with JWTs).
 * 2. While authenticated, the customer changes their password using
 *    /auth/customer/password/change with correct currentPassword and a new
 *    random password.
 * 3. The system records security events into shopping_mall_security_events (e.g.,
 *    PASSWORD_CHANGED, plus possibly login/registration events).
 * 4. The customer queries their own security events via PATCH
 *    /shoppingMall/customer/customers/{customerId}/securityEvents using an
 *    IShoppingMallSecurityEvent.IRequest filter with actor_type="customer" and
 *    a time window that includes the password-change moment.
 * 5. The response should be an IPageIShoppingMallSecurityEvent.ISummary page
 *    containing only customer-scoped events for that customer, with coherent
 *    pagination metadata and at least one PASSWORD_CHANGED event (if any events
 *    exist in the timeframe).
 */
export async function test_api_customer_security_events_after_password_change(
  connection: api.IConnection,
) {
  // 1. Customer self-registration (join) -> authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const joined: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(joined);

  const customerId = joined.id;

  // 2. Customer changes password using correct currentPassword
  const newPassword = RandomGenerator.alphaNumeric(14);
  const changeBody = {
    currentPassword: joinBody.password,
    newPassword,
  } satisfies IShoppingMallCustomerAuth.IChangePassword;

  const afterChange: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.password.change.changePassword(
      connection,
      {
        body: changeBody,
      },
    );
  typia.assert<IShoppingMallCustomer.IAuthorized>(afterChange);

  // 3. Build a time window around "now" that should include password change
  const now = new Date();
  const from = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const to = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

  const requestBody = {
    page: 1,
    limit: 20,
    actor_type: "customer",
    created_from: from,
    created_to: to,
  } satisfies IShoppingMallSecurityEvent.IRequest;

  // 4. Query customer-specific security events
  const page: IPageIShoppingMallSecurityEvent.ISummary =
    await api.functional.shoppingMall.customer.customers.securityEvents.index(
      connection,
      {
        customerId,
        body: requestBody,
      },
    );
  typia.assert<IPageIShoppingMallSecurityEvent.ISummary>(page);

  const pagination = page.pagination;
  const events = page.data;

  // 5. Basic pagination consistency checks
  TestValidator.predicate(
    "pagination current page is non-negative",
    () => pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    () => pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    () => pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    () => pagination.pages >= 0,
  );
  TestValidator.predicate(
    "records should be at least number of returned events",
    () => pagination.records >= events.length,
  );
  TestValidator.predicate(
    "limit should be at least number of returned events",
    () => pagination.limit >= events.length,
  );

  if (pagination.records === 0) {
    TestValidator.equals(
      "no records implies no events in data array",
      events.length,
      0,
    );
  }

  // 6. Ensure all events are customer-scoped when actor_type is present
  for (const ev of events) {
    TestValidator.predicate(
      "event actor_type, when present, must be 'customer'",
      () => ev.actor_type === undefined || ev.actor_type === "customer",
    );
  }

  // 7. If there are any events, ensure at least one looks like a password-change
  if (events.length > 0) {
    const hasPasswordChange = events.some(
      (ev) => ev.event_type === "PASSWORD_CHANGED",
    );

    TestValidator.predicate(
      "at least one PASSWORD_CHANGED event should exist when events are present",
      () => hasPasswordChange,
    );
  }
}
