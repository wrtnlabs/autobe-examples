import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPasswordReset";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_password_resets_search_filtering(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test search and filtering capabilities for the password reset audit endpoint.
   * This test validates various search criteria and filter combinations for password reset records.
   */
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const testEmail = typia.random<string & tags.Format<"email">>();
  const adminAuth = await authorize_member_join(adminConnection, {
    body: {
      email: testEmail,
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Test search by email address (partial matching)
  const emailSearchResult =
    await api.functional.discussionBoard.member.password_resets.index(
      adminConnection,
      {
        body: {
          search_email: testEmail.substring(0, 5),
          limit: 10,
        } satisfies IDiscussionBoardAdministratorPasswordReset.IRequest,
      },
    );
  typia.assert(emailSearchResult);
  TestValidator.equals(
    "email search returns valid pagination",
    emailSearchResult.pagination.current,
    1,
  );
  // 3. Test search by user_id (exact UUID match)
  const userIdSearchResult =
    await api.functional.discussionBoard.member.password_resets.index(
      adminConnection,
      {
        body: {
          search_user_id: adminAuth.id,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorPasswordReset.IRequest,
      },
    );
  typia.assert(userIdSearchResult);
  TestValidator.predicate(
    "user_id search returns valid response",
    userIdSearchResult.pagination.pages >= 0,
  );
  // 4. Test search by IP address (member records only)
  const ipSearchResult =
    await api.functional.discussionBoard.member.password_resets.index(
      adminConnection,
      {
        body: {
          search_ip_address: "192.168",
          user_type: "member",
          limit: 10,
        } satisfies IDiscussionBoardAdministratorPasswordReset.IRequest,
      },
    );
  typia.assert(ipSearchResult);
  TestValidator.equals(
    "IP search with member filter returns valid pagination",
    ipSearchResult.pagination.current,
    1,
  );
  // 5. Test search by user_agent (member records only)
  const userAgentSearchResult =
    await api.functional.discussionBoard.member.password_resets.index(
      adminConnection,
      {
        body: {
          search_user_agent: "Mozilla",
          user_type: "member",
          limit: 10,
        } satisfies IDiscussionBoardAdministratorPasswordReset.IRequest,
      },
    );
  typia.assert(userAgentSearchResult);
  TestValidator.predicate(
    "user_agent search returns valid response",
    userAgentSearchResult.pagination.pages >= 0,
  );
  // 6. Test combined filter: user_type='member' AND status='unused'
  const memberUnusedResult =
    await api.functional.discussionBoard.member.password_resets.index(
      adminConnection,
      {
        body: {
          user_type: "member",
          status: "unused",
          limit: 20,
        } satisfies IDiscussionBoardAdministratorPasswordReset.IRequest,
      },
    );
  typia.assert(memberUnusedResult);
  TestValidator.predicate(
    "member unused filter returns valid pagination",
    memberUnusedResult.pagination.current >= 1,
  );
  // Verify all returned records are members with unused status
  for (const record of memberUnusedResult.data) {
    TestValidator.equals(
      `record ${record.id} is member type`,
      record.user_type,
      "member",
    );
    TestValidator.equals(
      `record ${record.id} is unused`,
      record.is_used,
      false,
    );
  }
  // 7. Test combined filter: user_type='administrator' AND status='used'
  const adminUsedResult =
    await api.functional.discussionBoard.member.password_resets.index(
      adminConnection,
      {
        body: {
          user_type: "administrator",
          status: "used",
          limit: 20,
        } satisfies IDiscussionBoardAdministratorPasswordReset.IRequest,
      },
    );
  typia.assert(adminUsedResult);
  TestValidator.predicate(
    "administrator used filter returns valid pagination",
    adminUsedResult.pagination.current >= 1,
  );
  // Verify all returned records are administrators with used status
  for (const record of adminUsedResult.data) {
    TestValidator.equals(
      `record ${record.id} is administrator type`,
      record.user_type,
      "administrator",
    );
    TestValidator.equals(`record ${record.id} is used`, record.is_used, true);
  }
  // 8. Test date range filter with user_type filter
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.discussionBoard.member.password_resets.index(
      adminConnection,
      {
        body: {
          user_type: "member",
          created_at_from: oneMonthAgo.toISOString(),
          created_at_to: now.toISOString(),
          limit: 20,
        } satisfies IDiscussionBoardAdministratorPasswordReset.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filter returns valid pagination",
    dateRangeResult.pagination.current >= 1,
  );
  // Verify all records are within date range
  for (const record of dateRangeResult.data) {
    const createdAt = new Date(record.created_at);
    TestValidator.predicate(
      `record ${record.id} created_at is within range`,
      createdAt >= oneMonthAgo && createdAt <= now,
    );
  }
  // 9. Test multiple search criteria combined
  const combinedSearchResult =
    await api.functional.discussionBoard.member.password_resets.index(
      adminConnection,
      {
        body: {
          user_type: "member",
          status: "unused",
          search_email: "@",
          limit: 10,
        } satisfies IDiscussionBoardAdministratorPasswordReset.IRequest,
      },
    );
  typia.assert(combinedSearchResult);
  TestValidator.predicate(
    "combined search criteria returns valid response",
    combinedSearchResult.pagination.pages >= 0,
  );
  // 10. Verify member records include IP address and user_agent fields
  const memberRecordsResult =
    await api.functional.discussionBoard.member.password_resets.index(
      adminConnection,
      {
        body: {
          user_type: "member",
          limit: 5,
        } satisfies IDiscussionBoardAdministratorPasswordReset.IRequest,
      },
    );
  typia.assert(memberRecordsResult);
  // Check that member records have IP address and user_agent (may be null if not collected)
  for (const record of memberRecordsResult.data) {
    TestValidator.equals(
      `member record ${record.id} has user_type 'member'`,
      record.user_type,
      "member",
    );
    // IP address and user_agent may be present or null depending on collection
    TestValidator.predicate(
      `member record ${record.id} has valid structure`,
      typeof record.id === "string" &&
        typeof record.user_email === "string" &&
        typeof record.token === "string",
    );
  }
  // 11. Verify administrator records have null for IP address and user_agent
  const adminRecordsResult =
    await api.functional.discussionBoard.member.password_resets.index(
      adminConnection,
      {
        body: {
          user_type: "administrator",
          limit: 5,
        } satisfies IDiscussionBoardAdministratorPasswordReset.IRequest,
      },
    );
  typia.assert(adminRecordsResult);
  for (const record of adminRecordsResult.data) {
    TestValidator.equals(
      `admin record ${record.id} has user_type 'administrator'`,
      record.user_type,
      "administrator",
    );
    // Administrator records should have null for ip_address and user_agent
    TestValidator.equals(
      `admin record ${record.id} ip_address is null`,
      record.ip_address,
      null,
    );
    TestValidator.equals(
      `admin record ${record.id} user_agent is null`,
      record.user_agent,
      null,
    );
  }
  // 12. Confirm is_used field correctly reflects used_at timestamp
  const usedRecordsResult =
    await api.functional.discussionBoard.member.password_resets.index(
      adminConnection,
      {
        body: {
          status: "used",
          limit: 10,
        } satisfies IDiscussionBoardAdministratorPasswordReset.IRequest,
      },
    );
  typia.assert(usedRecordsResult);
  for (const record of usedRecordsResult.data) {
    TestValidator.equals(
      `used record ${record.id} has is_used = true`,
      record.is_used,
      true,
    );
    TestValidator.predicate(
      `used record ${record.id} has non-null used_at`,
      record.used_at !== null,
    );
  }
  const unusedRecordsResult =
    await api.functional.discussionBoard.member.password_resets.index(
      adminConnection,
      {
        body: {
          status: "unused",
          limit: 10,
        } satisfies IDiscussionBoardAdministratorPasswordReset.IRequest,
      },
    );
  typia.assert(unusedRecordsResult);
  for (const record of unusedRecordsResult.data) {
    TestValidator.equals(
      `unused record ${record.id} has is_used = false`,
      record.is_used,
      false,
    );
    TestValidator.equals(
      `unused record ${record.id} has null used_at`,
      record.used_at,
      null,
    );
  }
  // 13. Test filters when no matching records exist (empty result set)
  const emptySearchResult =
    await api.functional.discussionBoard.member.password_resets.index(
      adminConnection,
      {
        body: {
          search_user_id: "00000000-0000-0000-0000-000000000000",
          limit: 10,
        } satisfies IDiscussionBoardAdministratorPasswordReset.IRequest,
      },
    );
  typia.assert(emptySearchResult);
  TestValidator.equals(
    "empty search returns zero records",
    emptySearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search returns zero pages",
    emptySearchResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search returns empty data array",
    emptySearchResult.data.length,
    0,
  );
}
