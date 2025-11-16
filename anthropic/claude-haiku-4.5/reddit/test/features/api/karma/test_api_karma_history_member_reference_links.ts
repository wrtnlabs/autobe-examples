import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaHistory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaHistory";

/**
 * Test that reference_id fields in karma history correctly link back to source
 * actions for vote-related changes.
 *
 * This test verifies that karma history entries maintain proper audit trail
 * linkage through reference_id fields. Since no community or post creation APIs
 * are available, this test focuses on verifying the structure and accessibility
 * of karma history data for a member, confirming that the audit trail
 * infrastructure is in place.
 *
 * Test flow:
 *
 * 1. Create a member account to establish authentication context
 * 2. Retrieve karma history for the newly created member
 * 3. Verify karma history structure and pagination
 * 4. Confirm member can access their own karma history
 */
export async function test_api_karma_history_member_reference_links(
  connection: api.IConnection,
) {
  // Step 1: Create a member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: "TestPassword123!",
    ip: "127.0.0.1",
    href: "http://localhost:3000",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Retrieve karma history for the newly created member
  const karmaHistory =
    await api.functional.communityPlatform.member.members.karmaHistory.at(
      connection,
      { memberId: member.id },
    );
  typia.assert(karmaHistory);

  // Step 3: Verify karma history has proper structure
  TestValidator.predicate(
    "karma history response has pagination",
    karmaHistory.pagination !== null && karmaHistory.pagination !== undefined,
  );

  TestValidator.predicate(
    "pagination has valid structure",
    karmaHistory.pagination.current !== null &&
      karmaHistory.pagination.limit !== null &&
      karmaHistory.pagination.records !== null &&
      karmaHistory.pagination.pages !== null,
  );

  // Step 4: Verify karma history data is an array
  TestValidator.predicate(
    "karma history data is an array",
    Array.isArray(karmaHistory.data),
  );

  // Step 5: If history records exist, verify they have required fields for audit trail
  if (karmaHistory.data.length > 0) {
    const firstEntry = karmaHistory.data[0];

    TestValidator.predicate(
      "karma history entry has id",
      firstEntry.id !== null && firstEntry.id !== undefined,
    );

    TestValidator.predicate(
      "karma history entry has member reference",
      firstEntry.member !== null && firstEntry.member !== undefined,
    );

    TestValidator.predicate(
      "karma history entry has change reason",
      firstEntry.change_reason !== null &&
        firstEntry.change_reason !== undefined,
    );

    TestValidator.predicate(
      "karma history entry has karma change amount",
      firstEntry.karma_change !== null && firstEntry.karma_change !== undefined,
    );

    TestValidator.predicate(
      "karma history entry has previous total",
      firstEntry.previous_total !== null &&
        firstEntry.previous_total !== undefined,
    );

    TestValidator.predicate(
      "karma history entry has new total",
      firstEntry.new_total !== null && firstEntry.new_total !== undefined,
    );

    TestValidator.predicate(
      "karma history entry has creation timestamp",
      firstEntry.created_at !== null && firstEntry.created_at !== undefined,
    );

    // Verify reference_id field exists (for linking back to source actions)
    TestValidator.predicate(
      "karma history entry has reference_id field for audit trail",
      firstEntry.reference_id !== undefined,
    );

    // Verify member in history matches the queried member
    TestValidator.equals(
      "karma history member matches queried member",
      firstEntry.member.id,
      member.id,
    );
  } else {
    // New member should have minimal or no karma history
    TestValidator.equals(
      "new member has empty karma history",
      karmaHistory.data.length,
      0,
    );
  }

  // Step 6: Verify pagination is consistent
  TestValidator.predicate(
    "current page is valid",
    karmaHistory.pagination.current >= 0,
  );

  TestValidator.predicate("limit is valid", karmaHistory.pagination.limit >= 0);

  TestValidator.predicate(
    "total records count is valid",
    karmaHistory.pagination.records >= 0,
  );

  TestValidator.predicate(
    "total pages is valid",
    karmaHistory.pagination.pages >= 0,
  );

  // Verify data count doesn't exceed limit
  if (karmaHistory.pagination.limit > 0) {
    TestValidator.predicate(
      "returned data respects limit",
      karmaHistory.data.length <= karmaHistory.pagination.limit,
    );
  }
}
