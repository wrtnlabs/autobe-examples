import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaHistory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaHistory";

/**
 * Test karma history sorting by creation date in ascending and descending
 * order.
 *
 * This test verifies that members can sort their karma history chronologically
 * to understand the progression of karma changes over time. The test validates
 * that both ascending (oldest first) and descending (newest first) sort orders
 * return records in the correct chronological sequence, with proper pagination
 * support and no missing or duplicate records.
 *
 * Process:
 *
 * 1. Create a new member account
 * 2. Query karma history sorted by created_at_desc (newest first)
 * 3. Verify records are in reverse chronological order
 * 4. Query karma history sorted by created_at_asc (oldest first)
 * 5. Verify records are in forward chronological order
 * 6. Test pagination consistency with sorting
 * 7. Validate no records are skipped or duplicated
 */
export async function test_api_karma_history_member_sorting_by_creation_date(
  connection: api.IConnection,
) {
  // 1. Create a new member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: "SecurePassword123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const memberResponse: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(memberResponse);
  const memberId: string & tags.Format<"uuid"> = memberResponse.id;

  // 2. Query karma history sorted by created_at_desc (newest first)
  const descSortResponse: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.member.karmaHistory.index(
      connection,
      {
        body: {
          member_id: memberId,
          sort_by: "created_at_desc",
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(descSortResponse);

  // 3. Verify records are in reverse chronological order (newest first)
  if (descSortResponse.data.length > 1) {
    for (let i = 0; i < descSortResponse.data.length - 1; i++) {
      const current = descSortResponse.data[i];
      const next = descSortResponse.data[i + 1];
      TestValidator.predicate(
        "descending sort: current record should be >= next record chronologically",
        new Date(current.created_at).getTime() >=
          new Date(next.created_at).getTime(),
      );
    }
  }

  // 4. Query karma history sorted by created_at_asc (oldest first)
  const ascSortResponse: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.member.karmaHistory.index(
      connection,
      {
        body: {
          member_id: memberId,
          sort_by: "created_at_asc",
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(ascSortResponse);

  // 5. Verify records are in forward chronological order (oldest first)
  if (ascSortResponse.data.length > 1) {
    for (let i = 0; i < ascSortResponse.data.length - 1; i++) {
      const current = ascSortResponse.data[i];
      const next = ascSortResponse.data[i + 1];
      TestValidator.predicate(
        "ascending sort: current record should be <= next record chronologically",
        new Date(current.created_at).getTime() <=
          new Date(next.created_at).getTime(),
      );
    }
  }

  // 6. Verify same total record count in both sorts
  TestValidator.equals(
    "both sort orders should return same total record count",
    descSortResponse.pagination.records,
    ascSortResponse.pagination.records,
  );

  // 7. Verify consistency between ascending and descending sorts
  // The data should be the same, just in reverse order
  if (descSortResponse.data.length > 0) {
    const descendingIds = descSortResponse.data.map((record) => record.id);
    const ascendingIds = ascSortResponse.data.map((record) => record.id);
    const reversedAscendingIds = [...ascendingIds].reverse();

    TestValidator.equals(
      "ascending and descending sorts should contain the same records in reverse order",
      descendingIds,
      reversedAscendingIds,
    );
  }

  // 8. Test pagination consistency with descending sort
  if (descSortResponse.pagination.pages > 1) {
    const page2Response: IPageICommunityPlatformKarmaHistory =
      await api.functional.communityPlatform.member.karmaHistory.index(
        connection,
        {
          body: {
            member_id: memberId,
            sort_by: "created_at_desc",
            page: 2,
            limit: 50,
          } satisfies ICommunityPlatformKarmaHistory.IRequest,
        },
      );
    typia.assert(page2Response);

    // Verify page 2 records continue the descending order from page 1
    if (descSortResponse.data.length > 0 && page2Response.data.length > 0) {
      const lastPage1Record =
        descSortResponse.data[descSortResponse.data.length - 1];
      const firstPage2Record = page2Response.data[0];

      TestValidator.predicate(
        "page 2 first record should be chronologically before page 1 last record in desc sort",
        new Date(firstPage2Record.created_at).getTime() <=
          new Date(lastPage1Record.created_at).getTime(),
      );
    }
  }

  // 9. Test pagination consistency with ascending sort
  if (ascSortResponse.pagination.pages > 1) {
    const page2Response: IPageICommunityPlatformKarmaHistory =
      await api.functional.communityPlatform.member.karmaHistory.index(
        connection,
        {
          body: {
            member_id: memberId,
            sort_by: "created_at_asc",
            page: 2,
            limit: 50,
          } satisfies ICommunityPlatformKarmaHistory.IRequest,
        },
      );
    typia.assert(page2Response);

    // Verify page 2 records continue the ascending order from page 1
    if (ascSortResponse.data.length > 0 && page2Response.data.length > 0) {
      const lastPage1Record =
        ascSortResponse.data[ascSortResponse.data.length - 1];
      const firstPage2Record = page2Response.data[0];

      TestValidator.predicate(
        "page 2 first record should be chronologically after page 1 last record in asc sort",
        new Date(firstPage2Record.created_at).getTime() >=
          new Date(lastPage1Record.created_at).getTime(),
      );
    }
  }

  // 10. Verify no duplicate records in sort results
  const allDescIds = new Set<string>();
  for (const record of descSortResponse.data) {
    TestValidator.predicate(
      "descending sort result should not contain duplicate records",
      !allDescIds.has(record.id),
    );
    allDescIds.add(record.id);
  }

  const allAscIds = new Set<string>();
  for (const record of ascSortResponse.data) {
    TestValidator.predicate(
      "ascending sort result should not contain duplicate records",
      !allAscIds.has(record.id),
    );
    allAscIds.add(record.id);
  }

  // 11. Verify timestamp format is valid ISO 8601
  for (const record of descSortResponse.data) {
    TestValidator.predicate(
      "karma history record created_at should be valid ISO 8601 timestamp",
      !isNaN(new Date(record.created_at).getTime()),
    );
  }
}
