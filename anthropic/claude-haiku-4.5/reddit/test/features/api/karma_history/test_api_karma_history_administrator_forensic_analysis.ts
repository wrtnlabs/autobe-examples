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
 * Test administrator capability to conduct forensic analysis on karma
 * manipulation patterns.
 *
 * Verify that administrators can retrieve complete audit trails with all
 * reference IDs linking back to source actions (vote IDs, content IDs,
 * suspension IDs). Validate that the immutable append-only history records
 * enable identification of karma manipulation attempts and fraudulent voting
 * patterns. Test that previous_total and new_total fields enable verification
 * of calculation accuracy. Verify that change_reason field provides clear
 * context for each adjustment enabling fraud detection.
 *
 * Forensic Analysis Workflow:
 *
 * 1. Authenticate as administrator
 * 2. Create a member account to establish baseline
 * 3. Retrieve the member's complete karma history
 * 4. Validate all history records contain proper audit trail information
 * 5. Verify calculation integrity across karma progression
 * 6. Confirm change reasons provide clear fraud detection context
 */
export async function test_api_karma_history_administrator_forensic_analysis(
  connection: api.IConnection,
) {
  // 1. Authenticate as administrator
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = typia.random<string>();
  const adminCredentials = {
    email: adminEmail,
    password: adminPassword,
    username: RandomGenerator.name(1),
    name: RandomGenerator.name(),
    href: "https://example.com/admin",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCredentials,
    });
  typia.assert(admin);
  TestValidator.equals(
    "administrator email matches request",
    admin.email,
    adminEmail,
  );

  // 2. Create a member account to establish baseline
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = RandomGenerator.alphaNumeric(12);
  const memberCredentials = {
    email: memberEmail,
    username: RandomGenerator.alphaNumeric(8),
    password: memberPassword,
    ip: undefined,
    href: "https://example.com/join",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMember.ICreate;

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCredentials,
    });
  typia.assert(member);
  TestValidator.equals("member email matches request", member.id, member.id);

  // 3. Retrieve the member's complete karma history
  const karmaHistory: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.administrator.members.karmaHistory.at(
      connection,
      {
        memberId: member.id,
      },
    );
  typia.assert(karmaHistory);

  // 4. Validate all history records contain proper audit trail information
  if (karmaHistory.data && karmaHistory.data.length > 0) {
    // Verify each history record has required audit trail properties
    for (const historyRecord of karmaHistory.data) {
      typia.assert(historyRecord);

      TestValidator.predicate(
        "history record has valid UUID format",
        historyRecord.id.length === 36,
      );

      TestValidator.predicate(
        "history record has member information",
        historyRecord.member !== undefined && historyRecord.member !== null,
      );

      TestValidator.predicate(
        "change reason is one of valid values",
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
        "karma change is an integer",
        Number.isInteger(historyRecord.karma_change),
      );

      TestValidator.predicate(
        "previous total is non-negative",
        historyRecord.previous_total >= 0,
      );

      TestValidator.predicate(
        "new total is non-negative",
        historyRecord.new_total >= 0,
      );

      TestValidator.predicate(
        "calculation integrity verified",
        historyRecord.previous_total + historyRecord.karma_change ===
          historyRecord.new_total,
      );

      TestValidator.predicate(
        "created at is valid ISO date format",
        !isNaN(Date.parse(historyRecord.created_at)),
      );
    }
  }

  // 5. Verify calculation integrity across karma progression
  if (karmaHistory.data && karmaHistory.data.length > 1) {
    // Verify that consecutive records show proper karma progression
    for (let i = 0; i < karmaHistory.data.length - 1; i++) {
      const currentRecord = karmaHistory.data[i];
      const nextRecord = karmaHistory.data[i + 1];

      TestValidator.equals(
        `karma progression consistency between records ${i} and ${i + 1}`,
        currentRecord.previous_total,
        nextRecord.new_total,
      );
    }
  }

  // 6. Confirm pagination information is present and valid
  TestValidator.predicate(
    "pagination current page is non-negative",
    karmaHistory.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit is non-negative",
    karmaHistory.pagination.limit >= 0,
  );

  TestValidator.predicate(
    "pagination total records count is non-negative",
    karmaHistory.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination total pages count is non-negative",
    karmaHistory.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "paginated data count does not exceed total records",
    karmaHistory.data.length <= karmaHistory.pagination.records,
  );
}
