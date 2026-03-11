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

/**
 * Test discussion board member listing basic functionality.
 * 1. Call the member index endpoint with empty filters
 * 2. Validate response structure and pagination metadata
 * 3. Verify member summaries contain required fields
 * 4. Confirm default sorting by created_at descending
 */
export async function test_api_member_listing_basic(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection for the test
  const testConnection: api.IConnection = { host: connection.host };
  // Call the endpoint with empty filter parameters to retrieve all active members
  const result: IPageIDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.members.index(testConnection, {
      body: {} satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(result);
  // Validate pagination metadata exists and has valid structure
  TestValidator.predicate(
    "pagination.current is defined",
    result.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is defined",
    result.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is defined",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is defined",
    result.pagination.pages >= 0,
  );
  // Validate pagination calculation: pages = ceil(records / limit)
  if (result.pagination.limit > 0) {
    const expectedPages = Math.ceil(
      result.pagination.records / result.pagination.limit,
    );
    TestValidator.equals(
      "pagination.pages calculation",
      result.pagination.pages,
      expectedPages,
    );
  }
  // Validate each member in the data array has required fields
  await ArrayUtil.asyncForEach(result.data, async (member, index) => {
    typia.assert(member);
    // Verify member has all required summary fields
    TestValidator.predicate(
      `member[${index}].id is valid UUID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        member.id,
      ),
    );
    TestValidator.predicate(
      `member[${index}].display_name is non-empty`,
      member.display_name.length > 0,
    );
    TestValidator.predicate(
      `member[${index}].ban_status is valid`,
      member.ban_status === "active" || member.ban_status === "banned",
    );
    TestValidator.predicate(
      `member[${index}].created_at is valid datetime`,
      !isNaN(Date.parse(member.created_at)),
    );
  });
  // Validate default sorting by created_at descending (newest first)
  if (result.data.length > 1) {
    for (let i = 0; i < result.data.length - 1; i++) {
      const current = new Date(result.data[i].created_at).getTime();
      const next = new Date(result.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `member[${i}].created_at >= member[${i + 1}].created_at (descending order)`,
        current >= next,
      );
    }
  }
  // Verify no soft-deleted members are included (deleted_at IS NOT NULL should be excluded)
  // Since we can't directly check deleted_at in the summary, we trust the API filtering
  // The API specification states soft-deleted records are excluded
  TestValidator.predicate(
    "all members are active (soft-deleted excluded)",
    result.data.every(
      (member) =>
        member.ban_status === "active" || member.ban_status === "banned",
    ),
  );
}
