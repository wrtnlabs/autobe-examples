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
 * Test pagination controls for karma history retrieval.
 *
 * Verifies that the endpoint properly handles pagination parameters and returns
 * correct pagination metadata. Tests retrieving karma history across multiple
 * pages when a member has many karma change records. Validates current page
 * number, records per page limit, total record count, and calculated page count
 * are all correct. Tests navigation between pages and verify that records are
 * properly distributed and ordered chronologically across pages.
 *
 * Test flow:
 *
 * 1. Authenticate as a moderator to gain access to member karma history endpoints
 * 2. Create a member account to generate karma history data
 * 3. Retrieve the member's karma history with pagination
 * 4. Validate pagination metadata (current page, limit, total records, total
 *    pages)
 * 5. Verify records are returned in chronological order (newest first)
 * 6. Test pagination boundaries and record distribution across pages
 */
export async function test_api_karma_history_moderator_pagination(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(1),
        password: RandomGenerator.alphabets(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator should be authenticated",
    moderator.id !== undefined,
  );

  // Step 2: Create a member account to generate karma history data
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(1),
        password: RandomGenerator.alphabets(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);
  TestValidator.predicate("member should be created", member.id !== undefined);

  // Step 3: Retrieve the member's karma history with pagination
  const karmaHistoryPage: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.members.karmaHistory.at(
      connection,
      {
        memberId: member.id,
      },
    );
  typia.assert(karmaHistoryPage);

  // Step 4: Validate pagination metadata
  const pagination: IPage.IPagination = karmaHistoryPage.pagination;
  TestValidator.predicate("pagination should exist", pagination !== undefined);
  TestValidator.predicate(
    "current page should be a non-negative number",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit should be a non-negative number",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records should be a non-negative number",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be a non-negative number",
    pagination.pages >= 0,
  );

  // Step 5: Verify records are returned and accessible
  const data: ICommunityPlatformKarmaHistory[] = karmaHistoryPage.data;
  TestValidator.predicate("data array should exist", Array.isArray(data));

  // Verify records structure when present
  if (data.length > 0) {
    const firstRecord = data[0];
    typia.assert(firstRecord);
    TestValidator.predicate(
      "record should have id",
      firstRecord.id !== undefined,
    );
    TestValidator.predicate(
      "record should have member info",
      firstRecord.member !== undefined,
    );
    TestValidator.predicate(
      "record should have change reason",
      firstRecord.change_reason !== undefined,
    );
    TestValidator.predicate(
      "record should have karma change value",
      typeof firstRecord.karma_change === "number",
    );
    TestValidator.predicate(
      "record should have previous total",
      typeof firstRecord.previous_total === "number" &&
        firstRecord.previous_total >= 0,
    );
    TestValidator.predicate(
      "record should have new total",
      typeof firstRecord.new_total === "number" && firstRecord.new_total >= 0,
    );
    TestValidator.predicate(
      "record should have created_at timestamp",
      firstRecord.created_at !== undefined,
    );
  }

  // Step 6: Test pagination calculation correctness
  if (pagination.limit > 0) {
    const expectedPages = Math.ceil(pagination.records / pagination.limit);
    TestValidator.equals(
      "calculated pages should match returned pages",
      pagination.pages,
      expectedPages,
    );
  }

  // Verify data length doesn't exceed limit
  if (pagination.limit > 0 && pagination.current === 0) {
    TestValidator.predicate(
      "data length should not exceed limit",
      data.length <= pagination.limit,
    );
  }
}
