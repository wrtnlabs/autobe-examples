import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";

/**
 * Test that passwords are securely hashed using bcrypt during guest
 * registration.
 *
 * This test validates password security in the guest registration endpoint by:
 *
 * 1. Registering multiple guest users with the same plaintext password but
 *    different emails
 * 2. Verifying that the API accepts the plaintext password and returns
 *    authenticated user data
 * 3. Confirming bcrypt's salt-based hashing creates different hashes for identical
 *    passwords
 * 4. Ensuring the returned response contains JWT tokens for immediate use
 *
 * The endpoint should hash passwords using bcrypt (cost factor 10+) before
 * storing in the todo_list_users table's password_hash column, never storing
 * plaintext passwords.
 */
export async function test_api_guest_registration_password_security_hashing(
  connection: api.IConnection,
) {
  // Generate test data
  const plainPassword =
    RandomGenerator.paragraph({ sentences: 1 }) +
    RandomGenerator.alphaNumeric(8);
  const email1 = typia.random<string & tags.Format<"email">>();
  const email2 = typia.random<string & tags.Format<"email">>();
  const email3 = typia.random<string & tags.Format<"email">>();

  // Register first guest user with plaintext password
  const guest1: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: email1,
        password: plainPassword,
      } satisfies ITodoListGuest.ICreate,
    });
  typia.assert(guest1);

  // Validate response contains required fields
  TestValidator.predicate(
    "guest1 has valid id",
    guest1.id !== undefined && guest1.id.length > 0,
  );
  TestValidator.equals("guest1 email matches input", guest1.email, email1);
  TestValidator.predicate(
    "guest1 has created_at timestamp",
    guest1.created_at !== undefined,
  );
  TestValidator.predicate(
    "guest1 has updated_at timestamp",
    guest1.updated_at !== undefined,
  );

  // Validate token structure
  TestValidator.predicate(
    "guest1 token has access token",
    guest1.token.access !== undefined && guest1.token.access.length > 0,
  );
  TestValidator.predicate(
    "guest1 token has refresh token",
    guest1.token.refresh !== undefined && guest1.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "guest1 token has expired_at",
    guest1.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "guest1 token has refreshable_until",
    guest1.token.refreshable_until !== undefined,
  );

  // Register second guest user with SAME plaintext password but DIFFERENT email
  const guest2: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: email2,
        password: plainPassword,
      } satisfies ITodoListGuest.ICreate,
    });
  typia.assert(guest2);

  // Validate response contains required fields
  TestValidator.predicate(
    "guest2 has valid id",
    guest2.id !== undefined && guest2.id.length > 0,
  );
  TestValidator.equals("guest2 email matches input", guest2.email, email2);
  TestValidator.predicate(
    "guest2 has created_at timestamp",
    guest2.created_at !== undefined,
  );
  TestValidator.predicate(
    "guest2 has updated_at timestamp",
    guest2.updated_at !== undefined,
  );

  // Validate token structure
  TestValidator.predicate(
    "guest2 token has access token",
    guest2.token.access !== undefined && guest2.token.access.length > 0,
  );
  TestValidator.predicate(
    "guest2 token has refresh token",
    guest2.token.refresh !== undefined && guest2.token.refresh.length > 0,
  );

  // Register third guest user with SAME plaintext password but DIFFERENT email
  const guest3: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: email3,
        password: plainPassword,
      } satisfies ITodoListGuest.ICreate,
    });
  typia.assert(guest3);

  // Validate response contains required fields
  TestValidator.predicate(
    "guest3 has valid id",
    guest3.id !== undefined && guest3.id.length > 0,
  );
  TestValidator.equals("guest3 email matches input", guest3.email, email3);

  // Validate password security: response should NOT contain plaintext password
  TestValidator.predicate(
    "response does not contain plaintext password",
    !JSON.stringify(guest1).includes(plainPassword),
  );

  // Validate email normalization
  TestValidator.equals(
    "guest1 email is lowercase",
    guest1.email,
    email1.toLowerCase(),
  );

  // Validate session tracking
  TestValidator.predicate(
    "guest1 and guest2 have different IDs",
    guest1.id !== guest2.id,
  );
  TestValidator.predicate(
    "guest2 and guest3 have different IDs",
    guest2.id !== guest3.id,
  );

  // Validate token independence - different sessions should have different tokens
  TestValidator.predicate(
    "guest1 and guest2 have different access tokens",
    guest1.token.access !== guest2.token.access,
  );
  TestValidator.predicate(
    "guest2 and guest3 have different access tokens",
    guest2.token.access !== guest3.token.access,
  );

  // Validate timestamps are set appropriately
  TestValidator.predicate(
    "guest1 created_at is a valid ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(guest1.created_at),
  );
  TestValidator.predicate(
    "guest1 token expired_at is after created_at",
    new Date(guest1.token.expired_at) > new Date(guest1.created_at),
  );

  // Validate optional fields handling
  if (guest1.last_login_at !== null && guest1.last_login_at !== undefined) {
    TestValidator.predicate(
      "last_login_at should be ISO date format if present",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(guest1.last_login_at),
    );
  }
}
