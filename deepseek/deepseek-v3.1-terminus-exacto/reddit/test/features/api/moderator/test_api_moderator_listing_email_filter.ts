import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test email filtering functionality by searching for moderators using partial email matching.
 * Verify that the system correctly filters results based on email substring matching,
 * returning only moderators whose email addresses contain the specified substring.
 * Test with various email patterns to ensure robust partial matching.
 */
export async function test_api_moderator_listing_email_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for moderator management
  const adminConnection: api.IConnection = { host: connection.host };
  // First, get all moderators to understand the existing data
  const allModerators = await api.functional.communityPlatform.moderators.index(
    adminConnection,
    {
      body: {
        limit: 100,
        page: 1,
      } satisfies ICommunityPlatformModerator.IRequest,
    },
  );
  typia.assert(allModerators);
  if (allModerators.data.length === 0) {
    // If no moderators exist, we can't test filtering - skip the test
    return;
  }
  // Extract common email patterns from existing moderators for testing
  const firstModeratorEmail = allModerators.data[0].email;
  const emailDomain = firstModeratorEmail.split("@")[1] || "";
  const emailLocalPart = firstModeratorEmail.split("@")[0] || "";
  // Test 1: Partial email matching with local part substring
  if (emailLocalPart.length > 3) {
    const substring = emailLocalPart.substring(0, 3);
    const result1 = await api.functional.communityPlatform.moderators.index(
      adminConnection,
      {
        body: {
          email: substring,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformModerator.IRequest,
      },
    );
    typia.assert(result1);
    // Verify all returned moderators contain the substring in their email
    result1.data.forEach((moderator) => {
      TestValidator.predicate(
        `email should contain '${substring}' substring`,
        moderator.email.includes(substring),
      );
    });
  }
  // Test 2: Partial email matching with domain substring
  if (emailDomain.length > 3) {
    const substring = emailDomain.substring(0, 3);
    const result2 = await api.functional.communityPlatform.moderators.index(
      adminConnection,
      {
        body: {
          email: substring,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformModerator.IRequest,
      },
    );
    typia.assert(result2);
    // Verify all returned moderators contain the substring in their email
    result2.data.forEach((moderator) => {
      TestValidator.predicate(
        `email should contain '${substring}' substring`,
        moderator.email.includes(substring),
      );
    });
  }
  // Test 3: Empty string should return all moderators (no filtering)
  const result3 = await api.functional.communityPlatform.moderators.index(
    adminConnection,
    {
      body: {
        email: "",
        limit: 100,
        page: 1,
      } satisfies ICommunityPlatformModerator.IRequest,
    },
  );
  typia.assert(result3);
  // Empty string filter should return the same number of moderators as no filter
  TestValidator.equals(
    "empty string filter should return same count as no filter",
    result3.data.length,
    allModerators.data.length,
  );
  // Test 4: Non-matching substring should return empty results
  const result4 = await api.functional.communityPlatform.moderators.index(
    adminConnection,
    {
      body: {
        email: "nonexistentpattern12345xyz",
        limit: 10,
        page: 1,
      } satisfies ICommunityPlatformModerator.IRequest,
    },
  );
  typia.assert(result4);
  TestValidator.equals(
    "non-matching pattern should return empty results",
    result4.data.length,
    0,
  );
  // Test 5: Case insensitive matching (test with uppercase)
  if (emailLocalPart.length > 3) {
    const substring = emailLocalPart.substring(0, 3);
    const uppercaseSubstring = substring.toUpperCase();
    const result5 = await api.functional.communityPlatform.moderators.index(
      adminConnection,
      {
        body: {
          email: uppercaseSubstring,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformModerator.IRequest,
      },
    );
    typia.assert(result5);
    // Verify case insensitive matching works
    result5.data.forEach((moderator) => {
      TestValidator.predicate(
        `email should contain '${substring}' (case insensitive)`,
        moderator.email.toLowerCase().includes(substring.toLowerCase()),
      );
    });
  }
}
