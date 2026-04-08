import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneMember";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test filtering member accounts by account status (active vs deleted).
 *
 * Validates the member listing endpoint's ability to filter accounts by their deletion status. Tests that the API correctly distinguishes between active members (deleted_at IS NULL) and soft-deleted members (deleted_at IS NOT NULL) when using the status filter parameter.
 *
 * The test verifies that pagination metadata is accurate and that returned member summaries include all required fields including nested profile information.
 *
 * 1. Call the member listing endpoint with status='active' filter.
 * 2. Validate response structure and pagination metadata.
 * 3. Call the member listing endpoint with status='deleted' filter.
 * 4. Validate response structure and pagination metadata.
 * 5. Call the member listing endpoint without status filter.
 * 6. Validate response structure and verify both active and deleted members may be present.
 */
export async function test_api_member_list_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test with status='active' filter
  const activeResponse = await api.functional.redditClone.members.index(
    connection,
    {
      body: {
        status: "active",
        page: 1,
        limit: 20,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(activeResponse);
  // 2. Test with status='deleted' filter
  const deletedResponse = await api.functional.redditClone.members.index(
    connection,
    {
      body: {
        status: "deleted",
        page: 1,
        limit: 20,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(deletedResponse);
  // 3. Test without status filter (should return all members)
  const allResponse = await api.functional.redditClone.members.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(allResponse);
  // 4. Verify pagination consistency
  TestValidator.equals(
    "active filter page number",
    activeResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "deleted filter page number",
    deletedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "no filter page number",
    allResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "active filter limit",
    activeResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "deleted filter limit",
    deletedResponse.pagination.limit,
    20,
  );
  TestValidator.equals("no filter limit", allResponse.pagination.limit, 20);
  // 5. Verify that unfiltered count is at least as large as individual filtered counts
  TestValidator.predicate(
    "unfiltered count >= active count",
    allResponse.pagination.records >= activeResponse.pagination.records,
  );
  TestValidator.predicate(
    "unfiltered count >= deleted count",
    allResponse.pagination.records >= deletedResponse.pagination.records,
  );
  // 6. Verify data arrays match pagination records for page 1
  TestValidator.predicate(
    "active data length matches expected",
    activeResponse.data.length ===
      Math.min(
        activeResponse.pagination.records,
        activeResponse.pagination.limit,
      ),
  );
  TestValidator.predicate(
    "deleted data length matches expected",
    deletedResponse.data.length ===
      Math.min(
        deletedResponse.pagination.records,
        deletedResponse.pagination.limit,
      ),
  );
  TestValidator.predicate(
    "unfiltered data length matches expected",
    allResponse.data.length ===
      Math.min(allResponse.pagination.records, allResponse.pagination.limit),
  );
  // 7. Verify member IDs are unique within each response
  const activeIds = new Set(activeResponse.data.map((m) => m.id));
  TestValidator.equals(
    "active members have unique IDs",
    activeIds.size,
    activeResponse.data.length,
  );
  const deletedIds = new Set(deletedResponse.data.map((m) => m.id));
  TestValidator.equals(
    "deleted members have unique IDs",
    deletedIds.size,
    deletedResponse.data.length,
  );
  const allIds = new Set(allResponse.data.map((m) => m.id));
  TestValidator.equals(
    "all members have unique IDs",
    allIds.size,
    allResponse.data.length,
  );
  // 8. Verify no overlap between active and deleted members (same member cannot be both)
  const overlap = [...activeIds].filter((id) => deletedIds.has(id));
  TestValidator.equals(
    "no overlap between active and deleted members",
    overlap.length,
    0,
  );
}
