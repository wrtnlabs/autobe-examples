import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test that multiple moderator registrations create unique account IDs.
 *
 * Validates that the system correctly generates distinct UUID identifiers for
 * each moderator account created. This test ensures there are no ID collisions
 * or duplication issues in the moderator registration system.
 *
 * Test workflow:
 *
 * 1. Create first moderator account with unique credentials
 * 2. Create second moderator account with different credentials
 * 3. Verify first moderator received a valid UUID ID
 * 4. Verify second moderator received a valid UUID ID
 * 5. Confirm the two IDs are different (no collisions)
 */
export async function test_api_moderator_registration_creates_unique_ids(
  connection: api.IConnection,
) {
  // Create first moderator account
  const moderator1Email = typia.random<string & tags.Format<"email">>();
  const moderator1Username = `moderator_${RandomGenerator.alphaNumeric(8)}`;
  const moderator1Password = RandomGenerator.alphaNumeric(12);

  const firstModerator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderator1Email,
        username: moderator1Username,
        password: moderator1Password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(firstModerator);

  // Create second moderator account with different credentials
  const moderator2Email = typia.random<string & tags.Format<"email">>();
  const moderator2Username = `moderator_${RandomGenerator.alphaNumeric(8)}`;
  const moderator2Password = RandomGenerator.alphaNumeric(12);

  const secondModerator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderator2Email,
        username: moderator2Username,
        password: moderator2Password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(secondModerator);

  // Verify first moderator ID is a valid UUID
  TestValidator.predicate(
    "first moderator ID should be valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      firstModerator.id,
    ),
  );

  // Verify second moderator ID is a valid UUID
  TestValidator.predicate(
    "second moderator ID should be valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      secondModerator.id,
    ),
  );

  // Verify the two IDs are different (no ID collision)
  TestValidator.notEquals(
    "moderator IDs should be unique",
    firstModerator.id,
    secondModerator.id,
  );
}
