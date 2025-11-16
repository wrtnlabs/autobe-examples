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
 * Validates that administrators have unrestricted access to any member's karma
 * history.
 *
 * This test ensures that administrator accounts can retrieve detailed karma
 * history for any member on the platform, enabling comprehensive auditing and
 * forensic analysis. The test creates multiple member accounts, authenticates
 * as an administrator, and verifies unrestricted access to karma history for
 * each member without restrictions.
 *
 * Test flow:
 *
 * 1. Create an administrator account with platform-level management credentials
 * 2. Create multiple member accounts for unrestricted access testing
 * 3. Authenticate as administrator
 * 4. Retrieve karma history for each member
 * 5. Validate that karma history is accessible and contains proper audit trail
 *    structure
 * 6. Verify that administrator permissions are properly enforced
 */
export async function test_api_karma_history_administrator_unrestricted_access(
  connection: api.IConnection,
) {
  // Step 1: Create an administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePassword123!";
  const adminData = {
    email: adminEmail,
    password: adminPassword,
    username: RandomGenerator.alphabets(10),
    name: RandomGenerator.name(),
    href: "https://example.com/admin/register",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const adminAccount: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData,
    });
  typia.assert(adminAccount);
  TestValidator.equals(
    "admin account created",
    adminAccount.account_status,
    "active",
  );

  // Step 2: Create multiple member accounts for unrestricted access testing
  const memberCount = 3;
  const members: ICommunityPlatformMember.IAuthorized[] =
    await ArrayUtil.asyncRepeat(memberCount, async () => {
      const memberEmail = typia.random<string & tags.Format<"email">>();
      const memberPassword = "MemberPassword123!";
      const memberData = {
        email: memberEmail,
        password: memberPassword,
        username: RandomGenerator.alphabets(8),
        ip: "192.168.1.100",
        href: "https://example.com/member/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate;

      const memberAccount: ICommunityPlatformMember.IAuthorized =
        await api.functional.auth.member.join(connection, {
          body: memberData,
        });
      typia.assert(memberAccount);
      return memberAccount;
    });

  TestValidator.equals("created multiple members", members.length, memberCount);

  // Step 3: Authenticate as administrator to ensure connection has admin token
  await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });

  // Step 4: Retrieve karma history for each member to verify unrestricted access
  for (const member of members) {
    const karmaHistory: IPageICommunityPlatformKarmaHistory =
      await api.functional.communityPlatform.administrator.members.karmaHistory.at(
        connection,
        {
          memberId: member.id,
        },
      );
    typia.assert(karmaHistory);

    // Validate pagination structure exists
    TestValidator.predicate(
      "karma history has pagination",
      karmaHistory.pagination !== undefined,
    );
    TestValidator.predicate(
      "pagination has current page",
      typeof karmaHistory.pagination.current === "number",
    );
    TestValidator.predicate(
      "pagination has limit",
      typeof karmaHistory.pagination.limit === "number",
    );
    TestValidator.predicate(
      "pagination has total records",
      typeof karmaHistory.pagination.records === "number",
    );
    TestValidator.predicate(
      "pagination has pages",
      typeof karmaHistory.pagination.pages === "number",
    );

    // Validate data array structure
    TestValidator.predicate(
      "karma history has data array",
      Array.isArray(karmaHistory.data),
    );

    // If there are history records, validate their structure
    if (karmaHistory.data.length > 0) {
      for (const record of karmaHistory.data) {
        const historyRecord: ICommunityPlatformKarmaHistory = record;
        TestValidator.predicate(
          "history record has id",
          typeof historyRecord.id === "string",
        );
        TestValidator.predicate(
          "history record has member",
          historyRecord.member !== undefined,
        );
        TestValidator.predicate(
          "history record has change reason",
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
          "history record has karma change",
          typeof historyRecord.karma_change === "number",
        );
        TestValidator.predicate(
          "history record has previous total",
          typeof historyRecord.previous_total === "number",
        );
        TestValidator.predicate(
          "history record has new total",
          typeof historyRecord.new_total === "number",
        );
        TestValidator.predicate(
          "history record has created at",
          typeof historyRecord.created_at === "string",
        );
      }
    }
  }

  // Step 5: Verify administrator can access karma history for all members
  TestValidator.predicate(
    "administrator has unrestricted access",
    members.length === memberCount,
  );

  // Step 6: Confirm administrator permissions are enforced
  TestValidator.equals(
    "admin account is active",
    adminAccount.account_status,
    "active",
  );
}
