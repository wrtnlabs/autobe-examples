import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_listing_ban_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create test connection
  const testConnection: api.IConnection = { host: connection.host };
  // Test 1: Filter by ban_status='active'
  const activeMembers = await api.functional.discussionBoard.members.index(
    testConnection,
    {
      body: {
        ban_status: "active",
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(activeMembers);
  // Verify pagination metadata exists
  TestValidator.predicate(
    "active filter has pagination",
    () => activeMembers.pagination !== undefined,
  );
  TestValidator.predicate("active filter has data array", () =>
    Array.isArray(activeMembers.data),
  );
  // Verify all returned members have active ban_status
  for (const member of activeMembers.data) {
    TestValidator.equals(
      "active member has active status",
      member.ban_status,
      "active",
    );
  }
  // Test 2: Filter by ban_status='banned'
  const bannedMembers = await api.functional.discussionBoard.members.index(
    testConnection,
    {
      body: {
        ban_status: "banned",
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(bannedMembers);
  // Verify pagination metadata exists
  TestValidator.predicate(
    "banned filter has pagination",
    () => bannedMembers.pagination !== undefined,
  );
  TestValidator.predicate("banned filter has data array", () =>
    Array.isArray(bannedMembers.data),
  );
  // Verify all returned members have banned ban_status
  for (const member of bannedMembers.data) {
    TestValidator.equals(
      "banned member has banned status",
      member.ban_status,
      "banned",
    );
  }
  // Test 3: Combine ban_status filter with date range
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const filteredByDateAndStatus =
    await api.functional.discussionBoard.members.index(testConnection, {
      body: {
        ban_status: "active",
        created_at_from: thirtyDaysAgo.toISOString(),
        created_at_to: now.toISOString(),
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(filteredByDateAndStatus);
  // Verify pagination metadata
  TestValidator.predicate(
    "combined filter has valid pagination",
    () =>
      filteredByDateAndStatus.pagination.current >= 1 &&
      filteredByDateAndStatus.pagination.limit > 0,
  );
  // Verify all members have active status
  for (const member of filteredByDateAndStatus.data) {
    TestValidator.equals(
      "date+status filter member has active status",
      member.ban_status,
      "active",
    );
  }
  // Test 4: Verify pagination metadata structure
  TestValidator.predicate(
    "pagination has current field",
    () => typeof filteredByDateAndStatus.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination has limit field",
    () => typeof filteredByDateAndStatus.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination has records field",
    () => typeof filteredByDateAndStatus.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination has pages field",
    () => typeof filteredByDateAndStatus.pagination.pages === "number",
  );
}
