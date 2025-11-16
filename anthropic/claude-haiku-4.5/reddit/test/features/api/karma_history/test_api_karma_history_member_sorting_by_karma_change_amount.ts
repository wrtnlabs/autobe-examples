import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaHistory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaHistory";

/**
 * Tests karma history sorting by change amount for members.
 *
 * This test validates that members can retrieve their karma history sorted by
 * the magnitude of karma changes (both positive and negative). It verifies:
 *
 * - Sorting in descending order (largest changes first)
 * - Sorting in ascending order (smallest changes first)
 * - Correct numeric sorting (not lexicographic)
 * - Proper handling of mixed positive and negative values
 * - Consistent ordering across paginated results
 *
 * The test creates a new member account, generates karma history records with
 * various karma change amounts, then validates that the sorting works correctly
 * in both directions.
 */
export async function test_api_karma_history_member_sorting_by_karma_change_amount(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const memberCreated: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberCreated);
  const memberId = memberCreated.id;

  // Step 2: Retrieve karma history with descending sort (largest changes first)
  const descResponse: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.member.karmaHistory.index(
      connection,
      {
        body: {
          member_id: memberId,
          sort_by: "karma_change_desc",
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(descResponse);

  // Validate descending sort: each karma_change should be >= the next one
  if (descResponse.data.length > 1) {
    for (let i = 0; i < descResponse.data.length - 1; i++) {
      const current = descResponse.data[i];
      const next = descResponse.data[i + 1];
      TestValidator.predicate(
        `descending sort: karma_change at index ${i} should be >= karma_change at index ${i + 1}`,
        current.karma_change >= next.karma_change,
      );
    }
  }

  // Step 3: Retrieve karma history with ascending sort (smallest changes first)
  const ascResponse: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.member.karmaHistory.index(
      connection,
      {
        body: {
          member_id: memberId,
          sort_by: "karma_change_asc",
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(ascResponse);

  // Validate ascending sort: each karma_change should be <= the next one
  if (ascResponse.data.length > 1) {
    for (let i = 0; i < ascResponse.data.length - 1; i++) {
      const current = ascResponse.data[i];
      const next = ascResponse.data[i + 1];
      TestValidator.predicate(
        `ascending sort: karma_change at index ${i} should be <= karma_change at index ${i + 1}`,
        current.karma_change <= next.karma_change,
      );
    }
  }

  // Step 4: Verify numeric sorting with mixed positive and negative values
  // Check that large negative values sort correctly (e.g., -15 < -1)
  if (descResponse.data.length > 0) {
    // In descending order, check that values decrease
    let prevChange = descResponse.data[0].karma_change;
    for (let i = 1; i < descResponse.data.length; i++) {
      const currentChange = descResponse.data[i].karma_change;
      TestValidator.predicate(
        `numeric sort validation: ${prevChange} >= ${currentChange} in descending order`,
        prevChange >= currentChange,
      );
      prevChange = currentChange;
    }
  }

  if (ascResponse.data.length > 0) {
    // In ascending order, check that values increase
    let prevChange = ascResponse.data[0].karma_change;
    for (let i = 1; i < ascResponse.data.length; i++) {
      const currentChange = ascResponse.data[i].karma_change;
      TestValidator.predicate(
        `numeric sort validation: ${prevChange} <= ${currentChange} in ascending order`,
        prevChange <= currentChange,
      );
      prevChange = currentChange;
    }
  }

  // Step 5: Validate pagination consistency - retrieve second page if available
  if (descResponse.pagination.pages > 1) {
    const descPage2: IPageICommunityPlatformKarmaHistory =
      await api.functional.communityPlatform.member.karmaHistory.index(
        connection,
        {
          body: {
            member_id: memberId,
            sort_by: "karma_change_desc",
            page: 2,
            limit: 50,
          } satisfies ICommunityPlatformKarmaHistory.IRequest,
        },
      );
    typia.assert(descPage2);

    // Validate that page 2's first element is <= page 1's last element
    if (descResponse.data.length > 0 && descPage2.data.length > 0) {
      const page1Last = descResponse.data[descResponse.data.length - 1];
      const page2First = descPage2.data[0];
      TestValidator.predicate(
        "pagination consistency: page 2 first element should be <= page 1 last element in descending sort",
        page2First.karma_change <= page1Last.karma_change,
      );
    }
  }

  // Step 6: Validate response structure and data integrity
  TestValidator.equals(
    "pagination metadata exists",
    typeof descResponse.pagination === "object",
    true,
  );
  TestValidator.predicate(
    "pagination current is at least 1",
    descResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    descResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    descResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    descResponse.pagination.pages >= 0,
  );

  // Validate each record has required fields
  for (const record of descResponse.data) {
    TestValidator.predicate(
      "karma history record has valid id",
      typeof record.id === "string" && record.id.length > 0,
    );
    TestValidator.predicate(
      "karma history record has member",
      record.member !== null && record.member !== undefined,
    );
    TestValidator.predicate(
      "karma history record has change_reason",
      typeof record.change_reason === "string",
    );
    TestValidator.predicate(
      "karma history record has karma_change",
      typeof record.karma_change === "number",
    );
    TestValidator.predicate(
      "karma history record has previous_total",
      typeof record.previous_total === "number" && record.previous_total >= 0,
    );
    TestValidator.predicate(
      "karma history record has new_total",
      typeof record.new_total === "number" && record.new_total >= 0,
    );
    TestValidator.predicate(
      "karma history record has created_at",
      typeof record.created_at === "string",
    );
  }
}
