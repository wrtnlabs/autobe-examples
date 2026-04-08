import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunityModerator";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test listing all community moderator assignments across the platform.
 *
 * Validates the complete moderator listing functionality by retrieving all active moderator assignments with their associated community and user profile data. Ensures proper pagination, sorting, and data completeness.
 *
 * The test verifies that the API returns paginated results containing moderator assignments with correct structure, including community details (name, description, icon, owner, subscriber count), user profile information (display name, bio, avatar, karma), and assignment timestamps. Confirms that soft-deleted assignments are excluded from results.
 *
 * 1. Call PATCH /redditClone/moderators with empty request body to retrieve all assignments.
 * 2. Validate response structure contains pagination metadata and data array.
 * 3. Verify each assignment includes all required fields: id, role, community, userProfile, created_at, updated_at, deleted_at.
 * 4. Confirm deleted_at is null for all active assignments.
 * 5. Validate pagination fields: current, limit, records, pages.
 * 6. Ensure results are sorted by created_at descending by default.
 */
export async function test_api_moderator_list_all_assignments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Call API with empty request body to get all moderator assignments
  const response = await api.functional.redditClone.moderators.index(
    connection,
    {
      body: {} satisfies IRedditCloneCommunityModerator.IRequest,
    },
  );
  typia.assert(response);
  // 2. Validate pagination metadata exists and has correct structure
  TestValidator.predicate(
    "has pagination object",
    response.pagination !== undefined,
  );
  TestValidator.equals(
    "current page is at least 1",
    response.pagination.current,
    1,
  );
  TestValidator.predicate("limit is positive", response.pagination.limit > 0);
  TestValidator.predicate(
    "total records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 3. Validate data array exists
  TestValidator.predicate("has data array", Array.isArray(response.data));
  // 4. If there are assignments, validate their structure
  if (response.data.length > 0) {
    // Validate first assignment structure
    const firstAssignment = response.data[0];
    // Verify required fields exist
    TestValidator.predicate("has id", firstAssignment.id !== undefined);
    TestValidator.predicate("has role", firstAssignment.role !== undefined);
    TestValidator.predicate(
      "has community",
      firstAssignment.community !== undefined,
    );
    TestValidator.predicate(
      "has userProfile",
      firstAssignment.userProfile !== undefined,
    );
    TestValidator.predicate(
      "has created_at",
      firstAssignment.created_at !== undefined,
    );
    TestValidator.predicate(
      "has updated_at",
      firstAssignment.updated_at !== undefined,
    );
    TestValidator.predicate(
      "has deleted_at",
      firstAssignment.deleted_at !== undefined,
    );
    // Verify role is valid enum value
    TestValidator.predicate(
      "role is owner or moderator",
      firstAssignment.role === "owner" || firstAssignment.role === "moderator",
    );
    // Verify deleted_at is null for active assignment
    TestValidator.equals(
      "deleted_at is null for active assignment",
      firstAssignment.deleted_at,
      null,
    );
    // Validate community structure
    TestValidator.predicate(
      "community has id",
      firstAssignment.community.id !== undefined,
    );
    TestValidator.predicate(
      "community has name",
      firstAssignment.community.name !== undefined,
    );
    TestValidator.predicate(
      "community has description",
      firstAssignment.community.description !== undefined,
    );
    TestValidator.predicate(
      "community has owner",
      firstAssignment.community.owner !== undefined,
    );
    TestValidator.predicate(
      "community has subscriber_count",
      firstAssignment.community.subscriber_count !== undefined,
    );
    TestValidator.predicate(
      "community has created_at",
      firstAssignment.community.created_at !== undefined,
    );
    // Validate user profile structure
    TestValidator.predicate(
      "userProfile has id",
      firstAssignment.userProfile.id !== undefined,
    );
    TestValidator.predicate(
      "userProfile has display_name",
      firstAssignment.userProfile.display_name !== undefined,
    );
    TestValidator.predicate(
      "userProfile has karma",
      firstAssignment.userProfile.karma !== undefined,
    );
    TestValidator.predicate(
      "userProfile has created_at",
      firstAssignment.userProfile.created_at !== undefined,
    );
    // Validate timestamps are valid date-time format
    TestValidator.predicate(
      "created_at is valid date-time string",
      !isNaN(Date.parse(firstAssignment.created_at)),
    );
    TestValidator.predicate(
      "updated_at is valid date-time string",
      !isNaN(Date.parse(firstAssignment.updated_at)),
    );
    // 5. Verify sorting by created_at descending (if multiple records)
    if (response.data.length > 1) {
      const createdAt0 = new Date(response.data[0].created_at).getTime();
      const createdAt1 = new Date(response.data[1].created_at).getTime();
      TestValidator.predicate(
        "results sorted by created_at descending",
        createdAt0 >= createdAt1,
      );
    }
  }
  // 6. Validate pagination consistency
  TestValidator.predicate(
    "pagination pages calculation is correct",
    response.pagination.pages ===
      Math.ceil(response.pagination.records / response.pagination.limit),
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    response.data.length <= response.pagination.limit,
  );
}
