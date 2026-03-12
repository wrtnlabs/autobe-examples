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

export async function test_api_password_resets_admin_audit_query(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test password reset admin audit query functionality.
   * 1. Authenticate as member using utility function
   * 2. Query password reset records with various filters
   * 3. Validate response structure and pagination
   * 4. Verify record fields and data integrity
   */
  // 1. Authenticate as member using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 2. Query all password reset records without filters
  const allRecords =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {} satisfies IDiscussionBoardAdministratorPasswordReset.IRequest,
      },
    );
  typia.assert(allRecords);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    allRecords.pagination !== undefined,
  );
  TestValidator.equals("current page is 1", allRecords.pagination.current, 1);
  TestValidator.predicate("limit is positive", allRecords.pagination.limit > 0);
  // 3. Query with user_type filter (member only)
  const memberRecords =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          user_type: "member",
        } satisfies IDiscussionBoardAdministratorPasswordReset.IRequest,
      },
    );
  typia.assert(memberRecords);
  // Verify all records have user_type "member"
  await ArrayUtil.asyncForEach(memberRecords.data, async (record) => {
    TestValidator.equals(
      `record user_type is member`,
      record.user_type,
      "member",
    );
  });
  // 4. Query with status filter (unused)
  const unusedRecords =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          status: "unused",
        } satisfies IDiscussionBoardAdministratorPasswordReset.IRequest,
      },
    );
  typia.assert(unusedRecords);
  // Verify all unused records have is_used = false
  await ArrayUtil.asyncForEach(unusedRecords.data, async (record) => {
    TestValidator.equals(
      `unused record is_used is false`,
      record.is_used,
      false,
    );
    TestValidator.equals(`unused record used_at is null`, record.used_at, null);
  });
  // 5. Query with status filter (used)
  const usedRecords =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          status: "used",
        } satisfies IDiscussionBoardAdministratorPasswordReset.IRequest,
      },
    );
  typia.assert(usedRecords);
  // Verify all used records have is_used = true and used_at is not null
  await ArrayUtil.asyncForEach(usedRecords.data, async (record) => {
    TestValidator.equals(`used record is_used is true`, record.is_used, true);
    TestValidator.predicate(
      `used record used_at is not null`,
      record.used_at !== null,
    );
  });
  // 6. Query with date range filter
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const dateRangeRecords =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          created_at_from: oneMonthAgo.toISOString(),
          created_at_to: new Date().toISOString(),
        } satisfies IDiscussionBoardAdministratorPasswordReset.IRequest,
      },
    );
  typia.assert(dateRangeRecords);
  // Verify all records are within date range
  await ArrayUtil.asyncForEach(dateRangeRecords.data, async (record) => {
    const createdAt = new Date(record.created_at);
    TestValidator.predicate(
      `record created_at >= from`,
      createdAt >= oneMonthAgo,
    );
    TestValidator.predicate(`record created_at <= to`, createdAt <= new Date());
  });
  // 7. Query with email search
  const searchEmail = typia.random<string & tags.Format<"email">>();
  const emailSearchRecords =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          search_email: searchEmail,
        } satisfies IDiscussionBoardAdministratorPasswordReset.IRequest,
      },
    );
  typia.assert(emailSearchRecords);
  // Verify pagination and data structure
  TestValidator.predicate(
    "email search response has pagination",
    emailSearchRecords.pagination !== undefined,
  );
  TestValidator.predicate(
    "email search response has data array",
    Array.isArray(emailSearchRecords.data),
  );
  // 8. Query with pagination parameters
  const paginatedRecords =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "created_at",
          direction: "desc",
        } satisfies IDiscussionBoardAdministratorPasswordReset.IRequest,
      },
    );
  typia.assert(paginatedRecords);
  // Validate pagination values
  TestValidator.equals("page is 1", paginatedRecords.pagination.current, 1);
  TestValidator.equals("limit is 10", paginatedRecords.pagination.limit, 10);
  TestValidator.predicate(
    "data count <= limit",
    paginatedRecords.data.length <= 10,
  );
  // 9. Verify record structure for all records
  await ArrayUtil.asyncForEach(allRecords.data, async (record) => {
    // Verify required fields exist
    TestValidator.predicate(`record has id`, record.id !== undefined);
    TestValidator.predicate(
      `record has user_type`,
      record.user_type !== undefined,
    );
    TestValidator.predicate(`record has user_id`, record.user_id !== undefined);
    TestValidator.predicate(
      `record has user_email`,
      record.user_email !== undefined,
    );
    TestValidator.predicate(`record has token`, record.token !== undefined);
    TestValidator.predicate(
      `record has created_at`,
      record.created_at !== undefined,
    );
    TestValidator.predicate(
      `record has expired_at`,
      record.expired_at !== undefined,
    );
    TestValidator.predicate(`record has is_used`, record.is_used !== undefined);
    // Verify user_type is valid enum value
    TestValidator.predicate(
      `user_type is member or administrator`,
      record.user_type === "member" || record.user_type === "administrator",
    );
  });
}
