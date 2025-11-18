import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates that attempting to register with an email address already in use is
 * properly rejected.
 *
 * This test creates a user (with a valid, random email and all required
 * registration properties), then attempts to register another account using the
 * same email but a new password and new URIs. The first registration must
 * succeed and issue tokens; the second should fail with a business
 * logic/restriction error (duplicate email). No type errors or schema
 * violations are tested, only business logic correctness.
 */
export async function test_api_user_registration_with_duplicate_email(
  connection: api.IConnection,
) {
  // Create test user registration input
  const email = typia.random<string & tags.Format<"email">>();
  const password1 = typia.random<string & tags.Format<"password">>();
  const href1 = "https://example.com/register";
  const referrer1 = "https://google.com";

  // Step 1: Register the user for the first time (should succeed)
  const registered: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password: password1,
        href: href1,
        referrer: referrer1,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(registered);
  TestValidator.equals(
    "first registration email matches",
    registered.email,
    email,
  );
  TestValidator.predicate(
    "access token must be string",
    typeof registered.token.access === "string",
  );
  TestValidator.predicate(
    "refresh token must be string",
    typeof registered.token.refresh === "string",
  );
  TestValidator.predicate(
    "access token expires at is ISO date string",
    typeof registered.token.expired_at === "string",
  );
  TestValidator.predicate(
    "refresh token refreshable until is ISO date string",
    typeof registered.token.refreshable_until === "string",
  );

  // Step 2: Attempt duplicate registration (should fail)
  const password2 = typia.random<string & tags.Format<"password">>();
  const href2 = "https://example.com/new-registration";
  const referrer2 = "https://bing.com";

  await TestValidator.error(
    "duplicate email registration is rejected",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email, // same email as previous
          password: password2,
          href: href2,
          referrer: referrer2,
        } satisfies ITodoListUser.ICreate,
      });
    },
  );
}
