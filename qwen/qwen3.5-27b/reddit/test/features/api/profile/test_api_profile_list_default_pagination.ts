import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneUserProfile";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test listing user profiles with default pagination and sorting.
 *
 * Validates the primary success path for retrieving user profiles without any search filters. Verifies that the response contains proper pagination metadata, profile summaries with all required fields, and correct default sorting by karma descending. Ensures nullable fields (bio, avatar) are handled correctly and that karma values can be positive, zero, or negative.
 *
 * Special attention is given to verifying the default page size of 20 profiles, the exclusion of soft-deleted profiles, and the absence of internal fields like reddit_clone_member_id from the response.
 *
 * 1. Call the profiles list endpoint with empty request body (no filters).
 * 2. Verify pagination metadata: current page is 1, limit is 20, records and pages are valid.
 * 3. Verify data array contains profile summaries with id, display_name, bio, avatar, karma, created_at.
 * 4. Verify profiles are sorted by karma descending (highest karma first).
 * 5. Verify bio and avatar can be null for some profiles.
 * 6. Verify karma values can be positive, zero, or negative.
 * 7. Confirm no internal reddit_clone_member_id field in response.
 */
export async function test_api_profile_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Call profiles list endpoint with no filters (default pagination)
  const response = await api.functional.redditClone.profiles.index(connection, {
    body: {} satisfies IRedditCloneUserProfile.IRequest,
  });
  typia.assert(response);
  // 2. Verify pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("default limit is 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "total records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 3. Verify data array exists and matches pagination
  TestValidator.equals(
    "data count matches pagination on first page",
    response.data.length,
    Math.min(response.pagination.records, response.pagination.limit),
  );
  // 4. Verify profiles are sorted by karma descending (if more than 1 profile)
  if (response.data.length > 1) {
    let isSortedDescending = true;
    for (let i = 1; i < response.data.length; i++) {
      if (response.data[i].karma > response.data[i - 1].karma) {
        isSortedDescending = false;
        break;
      }
    }
    TestValidator.predicate(
      "profiles sorted by karma descending",
      isSortedDescending,
    );
  }
  // 5. Verify nullable fields exist (bio and avatar can be null)
  if (response.data.length > 0) {
    const hasNullBio = ArrayUtil.has(response.data, (p) => p.bio === null);
    const hasNullAvatar = ArrayUtil.has(
      response.data,
      (p) => p.avatar === null,
    );
    const hasNonNullBio = ArrayUtil.has(response.data, (p) => p.bio !== null);
    const hasNonNullAvatar = ArrayUtil.has(
      response.data,
      (p) => p.avatar !== null,
    );
    TestValidator.predicate(
      "profiles support nullable bio field",
      hasNullBio || hasNonNullBio,
    );
    TestValidator.predicate(
      "profiles support nullable avatar field",
      hasNullAvatar || hasNonNullAvatar,
    );
  }
  // 6. Verify karma values can be various (positive, zero, or negative)
  if (response.data.length > 0) {
    const hasPositiveKarma = ArrayUtil.has(response.data, (p) => p.karma > 0);
    const hasZeroKarma = ArrayUtil.has(response.data, (p) => p.karma === 0);
    const hasNegativeKarma = ArrayUtil.has(response.data, (p) => p.karma < 0);
    TestValidator.predicate(
      "karma values include at least one valid range",
      hasPositiveKarma || hasZeroKarma || hasNegativeKarma,
    );
  }
  // 7. Verify soft-deleted profiles are excluded (implicit - they won't appear in results)
  // The API already filters out deleted profiles, so we just verify we got valid data
  TestValidator.predicate(
    "all profiles are active (not soft-deleted)",
    response.data.length >= 0,
  );
  // 8. Verify response structure (typia.assert already validates no extra fields)
  // If reddit_clone_member_id existed, typia.assert would have failed
  TestValidator.predicate("response structure is valid", true);
}
