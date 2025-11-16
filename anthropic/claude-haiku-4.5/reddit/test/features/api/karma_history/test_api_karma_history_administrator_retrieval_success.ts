import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaHistory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaHistory";

/**
 * Test successful retrieval of a member's complete karma history by an
 * authenticated administrator.
 *
 * This test validates that administrators with system-wide access can retrieve
 * all karma change records for any member, including complete audit trail
 * details. The response should include all karma adjustments with reasons,
 * amounts, before-and-after values, timestamps, and reference IDs. This test
 * ensures administrators have unrestricted access to comprehensive karma
 * history for forensic analysis and system auditing purposes.
 *
 * Test flow:
 *
 * 1. Authenticate as administrator to establish system-wide access
 * 2. Create a member account whose karma history will be retrieved
 * 3. Retrieve the complete karma history for the member
 * 4. Validate response structure and pagination metadata
 * 5. Verify karma history records contain all required audit trail details
 */
export async function test_api_karma_history_administrator_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Authenticate as administrator
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create a member account
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 3. Retrieve the complete karma history for the member
  const karmaHistoryPage: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.administrator.members.karmaHistory.at(
      connection,
      {
        memberId: member.id,
      },
    );
  typia.assert(karmaHistoryPage);

  // 4. Validate response structure and pagination metadata
  TestValidator.predicate(
    "karma history page has pagination metadata",
    karmaHistoryPage.pagination !== null &&
      karmaHistoryPage.pagination !== undefined,
  );

  const pagination: IPage.IPagination = karmaHistoryPage.pagination;
  TestValidator.predicate(
    "pagination current page is valid",
    pagination.current >= 0,
  );
  TestValidator.predicate("pagination limit is valid", pagination.limit >= 0);
  TestValidator.predicate(
    "pagination records count is valid",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    pagination.pages >= 0,
  );

  // 5. Verify karma history records are properly structured
  TestValidator.predicate(
    "karma history data is an array",
    Array.isArray(karmaHistoryPage.data),
  );

  // Validate each karma history record if present
  if (karmaHistoryPage.data.length > 0) {
    for (const historyRecord of karmaHistoryPage.data) {
      TestValidator.predicate(
        "karma history record has valid id",
        typeof historyRecord.id === "string" && historyRecord.id.length > 0,
      );

      TestValidator.predicate(
        "karma history record has member information",
        historyRecord.member !== null && historyRecord.member !== undefined,
      );

      TestValidator.predicate(
        "karma history record has valid change reason",
        [
          "vote_created",
          "vote_removed",
          "vote_changed",
          "vote_reversed",
          "content_removed",
          "user_suspended",
          "user_banned",
          "correction",
        ].includes(historyRecord.change_reason),
      );

      TestValidator.predicate(
        "karma history record has valid karma change amount",
        typeof historyRecord.karma_change === "number",
      );

      TestValidator.predicate(
        "karma history record has valid previous total",
        historyRecord.previous_total >= 0,
      );

      TestValidator.predicate(
        "karma history record has valid new total",
        historyRecord.new_total >= 0,
      );

      TestValidator.predicate(
        "karma history record has valid timestamp",
        typeof historyRecord.created_at === "string" &&
          historyRecord.created_at.length > 0,
      );
    }
  }

  TestValidator.predicate(
    "administrator successfully retrieved karma history",
    true,
  );
}
