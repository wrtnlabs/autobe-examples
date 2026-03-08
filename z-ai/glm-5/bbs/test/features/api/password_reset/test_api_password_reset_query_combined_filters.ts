import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminPasswordReset";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_password_reset_query_combined_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  const now = new Date();
  // 2. Query with status='expired' filter
  const expiredResult =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          status: "expired",
          limit: 10,
        } satisfies IDiscussionBoardAdminPasswordReset.IRequest,
      },
    );
  typia.assert(expiredResult);
  // Verify all expired records have expiredAt in the past
  for (const record of expiredResult.data) {
    const expiredAt = new Date(record.expiredAt);
    TestValidator.predicate(
      "expired record should have expiredAt in the past",
      expiredAt < now,
    );
  }
  // 3. Query with status='active' filter
  const activeResult =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          status: "active",
          limit: 10,
        } satisfies IDiscussionBoardAdminPasswordReset.IRequest,
      },
    );
  typia.assert(activeResult);
  // Verify all active records have expiredAt in the future or present
  for (const record of activeResult.data) {
    const expiredAt = new Date(record.expiredAt);
    TestValidator.predicate(
      "active record should have expiredAt in the future or present",
      expiredAt >= now,
    );
  }
  // 4. Query with date range filters
  const dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateTo = now;
  const dateRangeResult =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          created_at_from: dateFrom.toISOString(),
          created_at_to: dateTo.toISOString(),
          limit: 10,
        } satisfies IDiscussionBoardAdminPasswordReset.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // Verify all records fall within date range
  for (const record of dateRangeResult.data) {
    const createdAt = new Date(record.createdAt);
    TestValidator.predicate(
      "record createdAt should be within date range",
      createdAt >= dateFrom && createdAt <= dateTo,
    );
  }
  // 5. Query with search text (partial email match)
  const searchText = RandomGenerator.alphabets(3);
  const searchResult =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          search: searchText,
          limit: 10,
        } satisfies IDiscussionBoardAdminPasswordReset.IRequest,
      },
    );
  typia.assert(searchResult);
  // Verify search matches partial email or displayName (case-insensitive)
  for (const record of searchResult.data) {
    const emailMatch = record.admin.email
      .toLowerCase()
      .includes(searchText.toLowerCase());
    const displayNameMatch = record.admin.displayName
      .toLowerCase()
      .includes(searchText.toLowerCase());
    TestValidator.predicate(
      "search should match email or displayName",
      emailMatch || displayNameMatch,
    );
  }
  // 6. Query with combined filters (actorType='member' AND status='expired' AND date range)
  const combinedResult =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          actorType: "member",
          status: "expired",
          created_at_from: dateFrom.toISOString(),
          created_at_to: dateTo.toISOString(),
          limit: 10,
        } satisfies IDiscussionBoardAdminPasswordReset.IRequest,
      },
    );
  typia.assert(combinedResult);
  // Verify all combined filter conditions are applied
  for (const record of combinedResult.data) {
    const expiredAt = new Date(record.expiredAt);
    const createdAt = new Date(record.createdAt);
    TestValidator.predicate(
      "combined filters: should be expired",
      expiredAt < now,
    );
    TestValidator.predicate(
      "combined filters: createdAt should be within date range",
      createdAt >= dateFrom && createdAt <= dateTo,
    );
  }
  // 7. Query with filters that should return empty results
  const futureDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const emptyResult =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          status: "expired",
          created_at_from: futureDate.toISOString(),
          limit: 10,
        } satisfies IDiscussionBoardAdminPasswordReset.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result for impossible filter combination",
    emptyResult.data.length,
    0,
  );
}
