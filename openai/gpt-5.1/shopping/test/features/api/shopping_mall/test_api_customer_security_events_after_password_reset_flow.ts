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
 * Validate that a customer can query their security events after initiating a
 * password reset flow.
 *
 * Business goal:
 *
 * - Ensure that after a customer registers and initiates a password reset
 *   request, the per-customer security event search endpoint returns a
 *   paginated list of security events scoped to that customer, and that at
 *   least one event looks like a password reset related event.
 *
 * High-level steps:
 *
 * 1. Join (register) a new customer via /auth/customer/join.
 * 2. Request a password reset for that customer via
 *    /auth/customer/password/reset/request.
 * 3. Build a security event search filter for actor_type="customer" with sane
 *    pagination.
 * 4. Call /shoppingMall/customer/customers/{customerId}/securityEvents.
 * 5. Validate pagination metadata and that returned events are consistent with the
 *    customer scope and contain at least one PASSWORD_RESET-like event_type
 *    when any events are present.
 */
export async function test_api_customer_security_events_after_password_reset_flow(
  connection: api.IConnection,
) {
  // 1. Register a new customer so we have a concrete customerId and email.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    // Optional ip is omitted; href and referrer are required.
    href: "https://shop.example.com/register",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const authorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(authorized);

  // 2. Initiate a password reset request for the same email.
  const resetRequestBody = {
    email: authorized.email,
  } satisfies IShoppingMallCustomerAuth.IRequestPasswordReset;

  const resetRequestResult: IShoppingMallCustomerAuth.IRequestPasswordResetResult =
    await api.functional.auth.customer.password.reset.request.requestPasswordReset(
      connection,
      {
        body: resetRequestBody,
      },
    );
  typia.assert<IShoppingMallCustomerAuth.IRequestPasswordResetResult>(
    resetRequestResult,
  );

  // 3. Build security event search request scoped by actor_type and pagination.
  const securityEventRequest = {
    page: 1,
    limit: 20,
    actor_type: "customer",
  } satisfies IShoppingMallSecurityEvent.IRequest;

  // 4. Query security events for this customer.
  const pageResult: IPageIShoppingMallSecurityEvent.ISummary =
    await api.functional.shoppingMall.customer.customers.securityEvents.index(
      connection,
      {
        customerId: authorized.id,
        body: securityEventRequest,
      },
    );
  typia.assert<IPageIShoppingMallSecurityEvent.ISummary>(pageResult);

  const pagination = pageResult.pagination;
  const events = pageResult.data;

  // 5. Basic pagination sanity checks.
  TestValidator.predicate(
    "pagination.records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.current is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "records is at least number of events",
    pagination.records >= events.length,
  );

  // When there are some events, perform additional checks about actor_type and event_type.
  if (events.length > 0) {
    // All defined actor_type values should be "customer" for this endpoint.
    for (const ev of events) {
      if (ev.actor_type !== undefined) {
        TestValidator.equals(
          "security event actor_type is customer when defined",
          ev.actor_type,
          "customer",
        );
      }
    }

    // Check that at least one event is password reset related by loose substring match.
    const hasPasswordResetLikeEvent = events.some((ev) =>
      ev.event_type.includes("PASSWORD_RESET"),
    );
    TestValidator.predicate(
      "at least one security event is password reset related when events exist",
      hasPasswordResetLikeEvent,
    );
  }
}
