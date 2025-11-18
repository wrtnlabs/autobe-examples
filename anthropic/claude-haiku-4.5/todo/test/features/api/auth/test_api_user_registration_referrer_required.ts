import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates that the referrer field is mandatory during user registration.
 *
 * The referrer field is a required field in the user registration DTO
 * (ITodoListUser.ICreate). Although the referrer can be an empty string for
 * direct registration, the field itself must be present in the request. This
 * test verifies that:
 *
 * 1. Registration succeeds when referrer is provided as empty string
 * 2. Referrer field can be an empty value for direct registration
 * 3. Registration succeeds with a non-empty referrer URL value
 */
export async function test_api_user_registration_referrer_required(
  connection: api.IConnection,
) {
  // Test 1: Successful registration with referrer as empty string
  // This validates that referrer can be empty but must be present
  const emptyReferrerUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(8),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: "", // Empty string is valid for direct registration
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(emptyReferrerUser);
  TestValidator.predicate(
    "user registered successfully with empty referrer",
    emptyReferrerUser.id !== null && emptyReferrerUser.id !== undefined,
  );

  // Test 2: Successful registration with referrer URL
  // This validates that referrer with actual URL value works correctly
  const referrerUrl = typia.random<string & tags.Format<"uri">>();
  const withReferrerUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(8),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: referrerUrl,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(withReferrerUser);
  TestValidator.predicate(
    "user registered successfully with non-empty referrer URL",
    withReferrerUser.id !== null && withReferrerUser.id !== undefined,
  );
  TestValidator.notEquals(
    "second user has different ID from first user",
    withReferrerUser.id,
    emptyReferrerUser.id,
  );
}
