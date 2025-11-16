import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaHistory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaHistory";

export async function test_api_karma_history_moderator_sorting_for_reporting(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account for report generation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Test sorting by created_at descending (most recent first)
  const recentKarmaPage: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          sort_by: "created_at_desc",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(recentKarmaPage);
  TestValidator.predicate(
    "karma history should be sorted by created_at descending",
    () => {
      for (let i = 0; i < recentKarmaPage.data.length - 1; i++) {
        const current = new Date(recentKarmaPage.data[i].created_at).getTime();
        const next = new Date(recentKarmaPage.data[i + 1].created_at).getTime();
        if (current < next) return false;
      }
      return true;
    },
  );

  // Step 3: Test sorting by created_at ascending (oldest first)
  const oldestKarmaPage: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          sort_by: "created_at_asc",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(oldestKarmaPage);
  TestValidator.predicate(
    "karma history should be sorted by created_at ascending",
    () => {
      for (let i = 0; i < oldestKarmaPage.data.length - 1; i++) {
        const current = new Date(oldestKarmaPage.data[i].created_at).getTime();
        const next = new Date(oldestKarmaPage.data[i + 1].created_at).getTime();
        if (current > next) return false;
      }
      return true;
    },
  );

  // Step 4: Test sorting by karma_change descending (largest gains first)
  const largestGainsPage: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          sort_by: "karma_change_desc",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(largestGainsPage);
  TestValidator.predicate(
    "karma history should be sorted by karma_change descending",
    () => {
      for (let i = 0; i < largestGainsPage.data.length - 1; i++) {
        if (
          largestGainsPage.data[i].karma_change <
          largestGainsPage.data[i + 1].karma_change
        )
          return false;
      }
      return true;
    },
  );

  // Step 5: Test sorting by karma_change ascending (largest decreases first)
  const largestDecreasesPage: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          sort_by: "karma_change_asc",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(largestDecreasesPage);
  TestValidator.predicate(
    "karma history should be sorted by karma_change ascending",
    () => {
      for (let i = 0; i < largestDecreasesPage.data.length - 1; i++) {
        if (
          largestDecreasesPage.data[i].karma_change >
          largestDecreasesPage.data[i + 1].karma_change
        )
          return false;
      }
      return true;
    },
  );

  // Step 6: Verify pagination consistency across sorted results
  const page1: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          sort_by: "created_at_desc",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(page1);

  const page2: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          sort_by: "created_at_desc",
          page: 2,
          limit: 10,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(page2);

  TestValidator.notEquals(
    "page 1 and page 2 should have different records",
    page1.data,
    page2.data,
  );

  // Step 7: Verify sorting works with filters (if data exists for the filter)
  const filteredSortedPage: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          change_reason: "vote_created",
          sort_by: "karma_change_desc",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(filteredSortedPage);

  // Verify sorting is maintained within filtered results
  if (filteredSortedPage.data.length > 1) {
    TestValidator.predicate(
      "filtered karma history should maintain karma_change descending sort",
      () => {
        for (let i = 0; i < filteredSortedPage.data.length - 1; i++) {
          if (
            filteredSortedPage.data[i].karma_change <
            filteredSortedPage.data[i + 1].karma_change
          )
            return false;
        }
        return true;
      },
    );
  }

  // Step 8: Verify all returned records have expected structure
  TestValidator.predicate(
    "all karma history records should have complete structure",
    () => {
      const allRecords = [
        ...recentKarmaPage.data,
        ...oldestKarmaPage.data,
        ...largestGainsPage.data,
        ...largestDecreasesPage.data,
      ];

      for (const record of allRecords) {
        if (
          !record.id ||
          !record.member ||
          record.karma_change === undefined ||
          record.previous_total === undefined ||
          record.new_total === undefined ||
          !record.created_at ||
          !record.change_reason
        ) {
          return false;
        }
      }
      return true;
    },
  );

  // Step 9: Verify pagination metadata is consistent
  TestValidator.predicate("pagination metadata should be valid", () => {
    return (
      recentKarmaPage.pagination.current >= 1 &&
      recentKarmaPage.pagination.limit > 0 &&
      recentKarmaPage.pagination.records >= 0 &&
      recentKarmaPage.pagination.pages >= 0
    );
  });
}
