import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";

export async function test_api_guest_registration_email_case_normalization(
  connection: api.IConnection,
) {
  // Test Case 1: Register with lowercase email
  const lowercaseEmail = typia.random<string & tags.Format<"email">>();
  const lowercaseEmailNormalized = lowercaseEmail.toLowerCase();

  const guest1: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: lowercaseEmailNormalized,
        password: "SecurePassword123",
      } satisfies ITodoListGuest.ICreate,
    });
  typia.assert(guest1);

  TestValidator.equals(
    "lowercase email should be stored in lowercase",
    guest1.email,
    lowercaseEmailNormalized,
  );

  // Test Case 2: Try to register with mixed case of same email (should fail - duplicate)
  const mixedCaseEmail = lowercaseEmailNormalized
    .split("@")
    .map((part, idx) => (idx === 0 ? part.toUpperCase() : part))
    .join("@");

  await TestValidator.error(
    "registration with mixed case email should fail due to case-insensitive uniqueness",
    async () => {
      await api.functional.auth.guest.join(connection, {
        body: {
          email: mixedCaseEmail,
          password: "DifferentPassword456",
        } satisfies ITodoListGuest.ICreate,
      });
    },
  );

  // Test Case 3: Register new email with uppercase
  const uppercaseEmail = typia.random<string & tags.Format<"email">>();
  const uppercaseEmailNormalized = uppercaseEmail.toLowerCase();
  const uppercaseVariant = uppercaseEmailNormalized.toUpperCase();

  const guest2: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: uppercaseVariant,
        password: "AnotherPassword789",
      } satisfies ITodoListGuest.ICreate,
    });
  typia.assert(guest2);

  TestValidator.equals(
    "uppercase email should be normalized to lowercase",
    guest2.email,
    uppercaseEmailNormalized,
  );

  // Test Case 4: Register third email with mixed case
  const mixedCaseNewEmail = typia.random<string & tags.Format<"email">>();
  const mixedCaseNewEmailNormalized = mixedCaseNewEmail.toLowerCase();

  const parts = mixedCaseNewEmailNormalized.split("@");
  const mixedCaseVariant =
    parts[0].charAt(0).toUpperCase() +
    parts[0].slice(1).toLowerCase() +
    "@" +
    parts[1];

  const guest3: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: mixedCaseVariant,
        password: "YetAnotherPassword000",
      } satisfies ITodoListGuest.ICreate,
    });
  typia.assert(guest3);

  TestValidator.equals(
    "mixed case email should be normalized to lowercase",
    guest3.email,
    mixedCaseNewEmailNormalized,
  );

  // Test Case 5: Verify all stored emails are consistent
  TestValidator.predicate(
    "all emails should be lowercase",
    guest1.email === guest1.email.toLowerCase() &&
      guest2.email === guest2.email.toLowerCase() &&
      guest3.email === guest3.email.toLowerCase(),
  );

  // Test Case 6: Verify tokens are valid JWT format
  TestValidator.predicate(
    "guest1 should have valid access token",
    guest1.token.access.length > 0,
  );
  TestValidator.predicate(
    "guest2 should have valid access token",
    guest2.token.access.length > 0,
  );
  TestValidator.predicate(
    "guest3 should have valid access token",
    guest3.token.access.length > 0,
  );

  // Test Case 7: Verify token expiration timestamps are valid
  TestValidator.predicate(
    "guest1 token should have valid expiration",
    new Date(guest1.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "guest2 token should have valid expiration",
    new Date(guest2.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "guest3 token should have valid expiration",
    new Date(guest3.token.expired_at) > new Date(),
  );
}
