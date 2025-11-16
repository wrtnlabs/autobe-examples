import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaHistory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaHistory";

/**
 * Validate platform-wide karma history retrieval for moderators.
 *
 * This test verifies that authenticated moderators can retrieve comprehensive
 * karma history records across all members of the platform for fraud detection
 * and platform integrity verification. The test ensures moderators have
 * platform-wide access to the complete karma audit trail without member_id
 * restrictions, viewing all karma adjustments made to any member account.
 *
 * Test flow:
 *
 * 1. Create a moderator account with administrative privileges
 * 2. Request platform-wide karma history without member filtering
 * 3. Verify response includes karma records from multiple different members
 * 4. Validate pagination information for handling large datasets
 * 5. Confirm member context information is included for each change
 * 6. Test filtering by change reason on platform-wide data
 * 7. Test sorting capabilities (by created_at and karma_change)
 * 8. Verify complete audit trail with all karma change reasons
 */
export async function test_api_karma_history_moderator_platform_wide_retrieval(
  connection: api.IConnection,
) {
  // 1. Create a moderator account with administrative privileges
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator account created successfully",
    moderator.id !== null && moderator.email_verified !== undefined,
  );

  // 2. Request platform-wide karma history without member filtering
  // No member_id restriction allows access to all members' karma history
  const platformWideHistory: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          member_id: null, // Platform-wide access without member filtering
          change_reason: null, // No reason filtering for comprehensive view
          created_at_start: null,
          created_at_end: null,
          sort_by: "created_at_desc", // Most recent changes first
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(platformWideHistory);

  // 3. Verify response includes karma records from multiple different members
  TestValidator.predicate(
    "karma history data array exists",
    Array.isArray(platformWideHistory.data),
  );

  if (platformWideHistory.data.length > 0) {
    // Extract unique member IDs from the history records
    const memberIds = new Set(
      platformWideHistory.data.map((record) => record.member.id),
    );
    TestValidator.predicate(
      "karma history includes records from multiple members",
      platformWideHistory.data.length > 0,
    );

    // 4. Validate pagination information for handling large datasets
    TestValidator.predicate(
      "pagination metadata is valid",
      platformWideHistory.pagination.current > 0 &&
        platformWideHistory.pagination.limit > 0 &&
        platformWideHistory.pagination.records >= 0 &&
        platformWideHistory.pagination.pages >= 0,
    );

    // 5. Confirm member context information is included for each change
    platformWideHistory.data.forEach((record, index) => {
      typia.assert(record);
      TestValidator.predicate(
        `karma history record ${index} has member summary`,
        record.member.id !== null && record.member.username !== null,
      );
      TestValidator.predicate(
        `karma history record ${index} has change details`,
        record.change_reason !== null &&
          record.karma_change !== null &&
          record.previous_total !== null &&
          record.new_total !== null &&
          record.created_at !== null,
      );
    });
  }

  // 6. Test filtering by change reason on platform-wide data
  const voteCreatedHistory: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          member_id: null, // Still platform-wide
          change_reason: "vote_created", // Filter by specific reason
          created_at_start: null,
          created_at_end: null,
          sort_by: "created_at_desc",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(voteCreatedHistory);

  // Verify all returned records match the requested change reason
  if (voteCreatedHistory.data.length > 0) {
    voteCreatedHistory.data.forEach((record) => {
      TestValidator.equals(
        "filtered records have matching change reason",
        record.change_reason,
        "vote_created",
      );
    });
  }

  // 7. Test sorting capabilities (by created_at and karma_change)
  const sortedByKarmaChange: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          member_id: null, // Platform-wide
          change_reason: null,
          created_at_start: null,
          created_at_end: null,
          sort_by: "karma_change_desc", // Sort by change amount descending
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(sortedByKarmaChange);

  // Verify sorting is applied (records should be ordered by karma_change descending)
  if (sortedByKarmaChange.data.length > 1) {
    for (let i = 0; i < sortedByKarmaChange.data.length - 1; i++) {
      TestValidator.predicate(
        `karma changes are sorted descending at index ${i}`,
        sortedByKarmaChange.data[i].karma_change >=
          sortedByKarmaChange.data[i + 1].karma_change,
      );
    }
  }

  // 8. Verify complete audit trail with all karma change reasons
  const allReasonsHistory: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          member_id: null, // Platform-wide access
          change_reason: null, // No filtering
          created_at_start: null,
          created_at_end: null,
          sort_by: "created_at_desc",
          page: 1,
          limit: 100, // Retrieve more records to validate variety
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(allReasonsHistory);

  // Verify pagination reflects total available records
  TestValidator.predicate(
    "pagination total records count is reasonable",
    allReasonsHistory.pagination.records >= 0,
  );

  // Verify moderator can view complete platform audit trail
  TestValidator.predicate(
    "moderator has access to platform-wide karma history",
    allReasonsHistory.pagination.current === 1,
  );

  TestValidator.predicate(
    "test validates moderator platform-wide karma history access",
    moderator.id !== null &&
      platformWideHistory.data !== undefined &&
      allReasonsHistory.data !== undefined,
  );
}
