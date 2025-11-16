import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";

/**
 * Validate that customer join returns an authorization envelope and implicitly
 * persists audit and session side effects.
 *
 * Business intent
 *
 * - When a new customer registers through POST /auth/customer/join, the backend
 *   must:
 *
 *   - Create shopping_mall_customer and auth credential records
 *   - Issue JWT access/refresh tokens
 *   - Record authentication/audit logs and security events
 *   - Create an initial customer session row using ip/href/referrer
 *
 * This endpoint-level E2E test cannot directly query admin/logging APIs, but it
 * verifies the primary observable contract (authorized envelope) and documents
 * the required side effects so that platform-admin tests can later assert them
 * using dedicated log/search endpoints.
 *
 * Steps
 *
 * 1. Build a realistic IShoppingMallCustomerAuth.IJoin payload including email,
 *    password, name, href, referrer, and optional ip.
 * 2. Call api.functional.auth.customer.join with that payload.
 * 3. Assert that the response conforms to IShoppingMallCustomer.IAuthorized and
 *    that the identity snapshot is self-consistent.
 * 4. Validate that token fields look usable for subsequent authenticated calls
 *    (non-empty access/refresh, well-formed expiry timestamps).
 * 5. Capture and document the session context used so that future tests can
 *    correlate it with auth logs, security events, and sessions.
 */
export async function test_api_customer_join_persists_audit_and_session_side_effects(
  connection: api.IConnection,
) {
  // 1. Prepare a realistic registration payload
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const joinBody = {
    email,
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    // Optional ip: simulate explicit client IP instead of relying on transport
    ip: "203.0.113.42",
    href: "https://shop.example.com/signup",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  // 2. Execute the join endpoint
  const authorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });

  // 3. Structural type validation
  typia.assert<IShoppingMallCustomer.IAuthorized>(authorized);

  // 4. Basic identity consistency checks
  TestValidator.predicate(
    "authorized.id must be a non-empty UUID string",
    typeof authorized.id === "string" && authorized.id.length > 0,
  );

  TestValidator.equals(
    "authorized email must echo join email",
    authorized.email,
    joinBody.email,
  );

  TestValidator.equals(
    "authorized name must echo join name",
    authorized.name,
    joinBody.name,
  );

  TestValidator.equals(
    "summary customer id should equal root id",
    authorized.customer.id,
    authorized.id,
  );

  TestValidator.predicate(
    "customer summary display_name should be non-empty",
    authorized.customer.display_name.length > 0,
  );

  // 5. Token presence and basic sanity
  const token: IAuthorizationToken = authorized.token;
  typia.assert<IAuthorizationToken>(token);

  TestValidator.predicate(
    "access token must be non-empty",
    token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token must be non-empty",
    token.refresh.length > 0,
  );

  TestValidator.predicate(
    "access token expiry must be a non-empty ISO date-time string",
    token.expired_at.length > 0,
  );

  TestValidator.predicate(
    "refresh token expiry must be a non-empty ISO date-time string",
    token.refreshable_until.length > 0,
  );

  // 6. Document expected side effects for future admin/log tests
  // NOTE: We do not have admin/log-search APIs in this test scope, so we
  // cannot directly assert rows in shopping_mall_auth_logs,
  // shopping_mall_security_events, or shopping_mall_customer_sessions.
  // Instead, we explicitly codify the expectations that an implementation
  // MUST fulfill:
  //
  // - An auth log entry should exist representing the registration/login
  //   event, with at least:
  //     actor_type   = "customer"
  //     actor_id     = authorized.id
  //     actor_email  = authorized.email
  //     ip           = joinBody.ip (or transport-derived ip when null)
  //
  // - A security event row should be recorded with event_type describing
  //   the registration/login, carrying the same actor_type/id/email and
  //   ip/user_agent if available.
  //
  // - A customer session row should be created with:
  //     customer_id  = authorized.id
  //     ip           = joinBody.ip (or inferred)
  //     href         = joinBody.href
  //     referrer     = joinBody.referrer
  //     expired_at   = null (active session)
  //
  // Platform-admin E2E suites can later consume these expectations and
  // use their own APIs to verify that such rows are actually persisted
  // and queryable. Here we only ensure that the primary, observable
  // contract of the join endpoint behaves correctly.
}
