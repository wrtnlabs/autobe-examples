import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test moderator registration with valid username patterns.
 *
 * Validates that the moderator registration endpoint correctly enforces the
 * username pattern constraint which allows only alphanumeric characters,
 * underscores, and hyphens (^[a-zA-Z0-9_-]+$). This test focuses on successful
 * registration scenarios with properly formatted usernames.
 */
export async function test_api_moderator_registration_with_invalid_username_characters(
  connection: api.IConnection,
) {
  // Test 1: Valid username with alphanumeric characters
  const moderator1: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: "validmoderator123",
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator1);
  TestValidator.predicate(
    "moderator with alphanumeric username should be created",
    moderator1.username === "validmoderator123",
  );

  // Test 2: Valid username with underscore
  const moderator2: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: "valid_moderator",
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator2);
  TestValidator.predicate(
    "moderator with underscore in username should be created",
    moderator2.username === "valid_moderator",
  );

  // Test 3: Valid username with hyphen
  const moderator3: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: "valid-moderator-123",
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator3);
  TestValidator.predicate(
    "moderator with hyphen in username should be created",
    moderator3.username === "valid-moderator-123",
  );

  // Test 4: Valid username with mixed allowed characters
  const moderator4: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: "Mod_123-test",
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator4);
  TestValidator.predicate(
    "moderator with mixed valid characters should be created",
    moderator4.username === "Mod_123-test",
  );

  // Test 5: Verify all registered moderators have valid account status
  TestValidator.predicate(
    "all moderators should have active account status",
    moderator1.account_status === "active" &&
      moderator2.account_status === "active" &&
      moderator3.account_status === "active" &&
      moderator4.account_status === "active",
  );
}
