import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

/**
 * Test username format and uniqueness constraints during contributor
 * registration.
 *
 * Validates that the registration endpoint enforces username constraints:
 *
 * - Length constraints: 3-50 characters
 * - Format constraints: alphanumeric and underscore only
 * - Uniqueness constraint: duplicate usernames are rejected
 *
 * Test cases include:
 *
 * 1. Valid usernames: 'alice_123', 'Bob_Smith', 'user_1'
 * 2. Invalid format (too short): 'ab'
 * 3. Invalid format (too long): 51+ characters
 * 4. Invalid format (special characters): 'alice@bob'
 * 5. Invalid format (spaces): 'alice smith'
 * 6. Invalid format (hyphens): 'alice-bob'
 * 7. Duplicate username rejection
 */
export async function test_api_contributor_registration_username_constraints(
  connection: api.IConnection,
) {
  // Test valid usernames - should succeed
  const validUsernames = ["alice_123", "Bob_Smith", "user_1"];

  for (const username of validUsernames) {
    const email = typia.random<string & tags.Format<"email">>();
    const password = "ValidPass123!";
    const href = typia.random<string & tags.Format<"uri">>();
    const referrer = typia.random<string & tags.Format<"uri">>();

    const contributor = await api.functional.auth.contributor.join(connection, {
      body: {
        email,
        username,
        password,
        href,
        referrer,
      } satisfies IDiscussionBoardContributor.ICreate,
    });
    typia.assert(contributor);
    TestValidator.equals(
      `username should match for valid username "${username}"`,
      contributor.username,
      username,
    );
  }

  // Test invalid usernames - too short (less than 3 characters)
  await TestValidator.error(
    "should reject username that is too short",
    async () => {
      await api.functional.auth.contributor.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          username: "ab",
          password: "ValidPass123!",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardContributor.ICreate,
      });
    },
  );

  // Test invalid usernames - too long (51+ characters)
  const longUsername = "a".repeat(51);
  await TestValidator.error(
    "should reject username that is too long",
    async () => {
      await api.functional.auth.contributor.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          username: longUsername,
          password: "ValidPass123!",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardContributor.ICreate,
      });
    },
  );

  // Test invalid usernames - special character (@)
  await TestValidator.error(
    "should reject username with special character @",
    async () => {
      await api.functional.auth.contributor.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          username: "alice@bob",
          password: "ValidPass123!",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardContributor.ICreate,
      });
    },
  );

  // Test invalid usernames - space character
  await TestValidator.error(
    "should reject username with space character",
    async () => {
      await api.functional.auth.contributor.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          username: "alice smith",
          password: "ValidPass123!",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardContributor.ICreate,
      });
    },
  );

  // Test invalid usernames - hyphen character
  await TestValidator.error(
    "should reject username with hyphen character",
    async () => {
      await api.functional.auth.contributor.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          username: "alice-bob",
          password: "ValidPass123!",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardContributor.ICreate,
      });
    },
  );

  // Test duplicate username rejection
  const duplicateUsername = "testuser123";
  const duplicateEmail1 = typia.random<string & tags.Format<"email">>();
  const duplicateEmail2 = typia.random<string & tags.Format<"email">>();

  // First registration should succeed
  const firstContributor = await api.functional.auth.contributor.join(
    connection,
    {
      body: {
        email: duplicateEmail1,
        username: duplicateUsername,
        password: "ValidPass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    },
  );
  typia.assert(firstContributor);

  // Second registration with same username should fail
  await TestValidator.error("should reject duplicate username", async () => {
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: duplicateEmail2,
        username: duplicateUsername,
        password: "ValidPass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  });
}
