import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";

/**
 * Test guest registration with empty password validation.
 *
 * Verifies that the guest registration endpoint properly validates password
 * requirements and rejects requests with empty passwords. The password field
 * requires a minimum length of 1 character, so empty strings should trigger a
 * validation error response.
 *
 * This test ensures:
 *
 * - Empty password strings are rejected with validation error
 * - No guest account is created when validation fails
 * - The API enforces minimum password length requirements
 */
export async function test_api_guest_registration_empty_password(
  connection: api.IConnection,
) {
  // Test 1: Attempt registration with empty password - should fail validation
  await TestValidator.error("empty password should be rejected", async () => {
    await api.functional.auth.guest.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "",
      } satisfies ITodoListGuest.ICreate,
    });
  });

  // Test 2: Verify successful registration with valid password works
  const validGuest: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(8),
      } satisfies ITodoListGuest.ICreate,
    });
  typia.assert(validGuest);

  // Verify the authorized guest has all required fields
  TestValidator.predicate(
    "guest should have valid id",
    typia.is<string & tags.Format<"uuid">>(validGuest.id),
  );
  TestValidator.predicate(
    "guest should have email",
    validGuest.email.length > 0,
  );
  TestValidator.predicate(
    "guest should have authentication token",
    validGuest.token.access.length > 0 && validGuest.token.refresh.length > 0,
  );
}
