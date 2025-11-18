import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";

/**
 * Validate successful customer self-service registration and issued session
 * token.
 *
 * This test exercises the POST /auth/customer/join endpoint end-to-end,
 * ensuring that a new customer can register with valid credentials and session
 * metadata, and that the backend returns an authorized customer payload with a
 * usable authorization token structure.
 *
 * Business goals validated:
 *
 * 1. A unique, valid email and password with realistic href/referrer/ip fields
 *    result in successful account creation.
 * 2. The response strictly conforms to IShoppingMallCustomer.IAuthorized,
 *    including nested IAuthorizationToken fields.
 * 3. Core identity fields (id, email, timestamps) are populated consistently, with
 *    email reflecting the input and timestamps being well-formed.
 * 4. Initial business state is reasonable (non-empty status, email_verified is
 *    false on first join according to typical flows).
 * 5. Issued tokens are non-empty strings with expiry metadata in the future,
 *    suitable for immediate use by clients.
 *
 * Note: Although the underlying SDK updates connection.headers.Authorization
 * with the issued access token, higher-level testing rules prohibit direct
 * interaction with connection.headers in this E2E function. Therefore, this
 * test focuses on DTO correctness and token semantics rather than explicitly
 * asserting header mutation or follow-up authenticated calls.
 */
export async function test_api_customer_join_success_creates_account_and_session(
  connection: api.IConnection,
) {
  // 1. Prepare a realistic, unique join request payload
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();

  const joinBody = {
    email,
    password,
    ip,
    href,
    referrer,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  // 2. Call the join endpoint to register a new customer
  const authorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });

  // 3. Validate the response structure thoroughly
  typia.assert<IShoppingMallCustomer.IAuthorized>(authorized);

  // 4. Business-level identity validations
  TestValidator.equals("joined email matches input", authorized.email, email);

  TestValidator.predicate(
    "customer id is a non-empty uuid string (format already validated by typia)",
    authorized.id.length > 0,
  );

  TestValidator.predicate(
    "status is a non-empty string",
    authorized.status.length > 0,
  );

  TestValidator.equals(
    "email is not verified immediately after join",
    authorized.email_verified,
    false,
  );

  // 5. Basic temporal consistency checks on timestamps
  const createdAtMs = Date.parse(authorized.created_at);
  const updatedAtMs = Date.parse(authorized.updated_at);

  TestValidator.predicate(
    "created_at parses to a valid timestamp",
    Number.isFinite(createdAtMs),
  );

  TestValidator.predicate(
    "updated_at parses to a valid timestamp",
    Number.isFinite(updatedAtMs),
  );

  TestValidator.predicate(
    "created_at is not after updated_at",
    createdAtMs <= updatedAtMs,
  );

  if (
    authorized.last_login_at !== null &&
    authorized.last_login_at !== undefined
  ) {
    const lastLoginMs = Date.parse(authorized.last_login_at);
    TestValidator.predicate(
      "last_login_at parses to a valid timestamp when present",
      Number.isFinite(lastLoginMs),
    );
  }

  if (authorized.deleted_at !== null && authorized.deleted_at !== undefined) {
    const deletedAtMs = Date.parse(authorized.deleted_at);
    TestValidator.predicate(
      "deleted_at parses to a valid timestamp when present",
      Number.isFinite(deletedAtMs),
    );
  }

  // 6. Token semantics: non-empty values and future expirations
  const token: IAuthorizationToken = authorized.token;

  TestValidator.predicate("access token is non-empty", token.access.length > 0);

  TestValidator.predicate(
    "refresh token is non-empty",
    token.refresh.length > 0,
  );

  const expiredAtMs = Date.parse(token.expired_at);
  const refreshableUntilMs = Date.parse(token.refreshable_until);
  const nowMs = Date.now();

  TestValidator.predicate(
    "expired_at parses to a valid timestamp",
    Number.isFinite(expiredAtMs),
  );

  TestValidator.predicate(
    "refreshable_until parses to a valid timestamp",
    Number.isFinite(refreshableUntilMs),
  );

  TestValidator.predicate(
    "access token expiry is in the future",
    expiredAtMs > nowMs,
  );

  TestValidator.predicate(
    "refreshable_until is not before expired_at",
    refreshableUntilMs >= expiredAtMs,
  );
}
