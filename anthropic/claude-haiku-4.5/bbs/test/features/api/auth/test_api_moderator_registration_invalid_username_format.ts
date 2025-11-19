import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator registration with username length constraints.
 *
 * Validates that the moderator registration API properly handles username
 * length constraints. The username field must be 3-50 characters containing
 * only alphanumeric characters and underscores (pattern: ^[a-zA-Z0-9_]+$).
 *
 * Since the pattern constraint is enforced at the TypeScript type level, we
 * test:
 *
 * 1. Valid usernames at minimum length boundary (exactly 3 characters)
 * 2. Valid usernames at maximum length boundary (exactly 50 characters)
 * 3. Valid usernames with alphanumeric and underscore characters
 * 4. Successful registration with proper format
 */
export async function test_api_moderator_registration_invalid_username_format(
  connection: api.IConnection,
) {
  // Test 1: Username at minimum valid length (3 characters)
  const minLengthRegistration = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
        username: "abc",
      } satisfies IDiscussionBoardModerator.ICreate,
    },
  );
  typia.assert(minLengthRegistration);
  TestValidator.predicate(
    "username at minimum length (3 chars) should succeed",
    minLengthRegistration.username === "abc",
  );

  // Test 2: Username at maximum valid length (50 characters)
  const maxLengthUsername = "a".repeat(50);
  const maxLengthRegistration = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
        username: maxLengthUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    },
  );
  typia.assert(maxLengthRegistration);
  TestValidator.predicate(
    "username at maximum length (50 chars) should succeed",
    maxLengthRegistration.username === maxLengthUsername,
  );

  // Test 3: Username with alphanumeric characters
  const alphanumericRegistration = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
        username: "User123",
      } satisfies IDiscussionBoardModerator.ICreate,
    },
  );
  typia.assert(alphanumericRegistration);
  TestValidator.predicate(
    "username with alphanumeric characters should succeed",
    alphanumericRegistration.username === "User123",
  );

  // Test 4: Username with underscores
  const underscoreRegistration = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
        username: "valid_user_123",
      } satisfies IDiscussionBoardModerator.ICreate,
    },
  );
  typia.assert(underscoreRegistration);
  TestValidator.predicate(
    "username with underscores should succeed",
    underscoreRegistration.username === "valid_user_123",
  );

  // Test 5: Username matching pattern constraint
  const patternRegistration = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
        username: "moderator_2024",
      } satisfies IDiscussionBoardModerator.ICreate,
    },
  );
  typia.assert(patternRegistration);
  TestValidator.predicate(
    "registered username should match alphanumeric and underscore pattern",
    /^[a-zA-Z0-9_]+$/.test(patternRegistration.username),
  );
}
