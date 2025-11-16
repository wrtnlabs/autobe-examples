import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaHistory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaHistory";

export async function test_api_karma_history_moderator_filter_specific_member_karma(
  connection: api.IConnection,
) {
  // Create a moderator account for accessing karma history
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(8),
      password: "SecurePass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Query karma history without member_id filter to get all records
  const allKarmaHistory: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          member_id: null,
          change_reason: null,
          created_at_start: null,
          created_at_end: null,
          sort_by: "created_at_desc",
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(allKarmaHistory);
  TestValidator.predicate(
    "all karma history should contain records",
    allKarmaHistory.data.length > 0,
  );

  // Extract unique member IDs from the results
  const memberIds = Array.from(
    new Set(allKarmaHistory.data.map((record) => record.member.id)),
  );
  TestValidator.predicate(
    "should have at least one unique member in history",
    memberIds.length > 0,
  );

  // Test filtering for each unique member ID
  for (const memberId of memberIds) {
    const filteredHistory: IPageICommunityPlatformKarmaHistory =
      await api.functional.communityPlatform.moderator.karmaHistory.index(
        connection,
        {
          body: {
            member_id: memberId,
            change_reason: null,
            created_at_start: null,
            created_at_end: null,
            sort_by: "created_at_desc",
            page: 1,
            limit: 50,
          } satisfies ICommunityPlatformKarmaHistory.IRequest,
        },
      );
    typia.assert(filteredHistory);

    // Verify all returned records belong to the specified member
    for (const record of filteredHistory.data) {
      TestValidator.equals(
        `filtered record member ID should match requested member_id ${memberId}`,
        record.member.id,
        memberId,
      );
    }

    // Verify that the filtered results match what we expect from the unfiltered results
    const expectedRecords = allKarmaHistory.data.filter(
      (record) => record.member.id === memberId,
    );
    TestValidator.equals(
      `filtered history count should match expected records for member ${memberId}`,
      filteredHistory.data.length,
      expectedRecords.length,
    );

    // Verify each filtered record matches the expected records
    for (let i = 0; i < filteredHistory.data.length; i++) {
      TestValidator.equals(
        `filtered record at index ${i} should match expected record for member ${memberId}`,
        filteredHistory.data[i].id,
        expectedRecords[i].id,
      );
    }
  }

  // Test filtering with a specific member and verify complete history
  if (memberIds.length > 0) {
    const targetMemberId = memberIds[0];
    const targetMemberHistory: IPageICommunityPlatformKarmaHistory =
      await api.functional.communityPlatform.moderator.karmaHistory.index(
        connection,
        {
          body: {
            member_id: targetMemberId,
            change_reason: null,
            created_at_start: null,
            created_at_end: null,
            sort_by: "created_at_desc",
            page: 1,
            limit: 100,
          } satisfies ICommunityPlatformKarmaHistory.IRequest,
        },
      );
    typia.assert(targetMemberHistory);

    // Verify pagination information is accurate
    TestValidator.predicate(
      `pagination page should be at least 1`,
      targetMemberHistory.pagination.current >= 1,
    );
    TestValidator.predicate(
      `pagination limit should be greater than 0`,
      targetMemberHistory.pagination.limit > 0,
    );
    TestValidator.predicate(
      `pagination records should match actual data length or total records`,
      targetMemberHistory.pagination.records >= targetMemberHistory.data.length,
    );

    // Verify all records in the target member history belong to the target member
    for (const record of targetMemberHistory.data) {
      TestValidator.equals(
        `each record in target member history should belong to target member ${targetMemberId}`,
        record.member.id,
        targetMemberId,
      );
      // Verify karma history record has required fields
      typia.assert<ICommunityPlatformKarmaHistory>(record);
    }
  }
}
