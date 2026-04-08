import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityGuest";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test guest listing with deletion status filtering.
 *
 * Validates the guest listing endpoint's ability to filter by deletion status. Tests three filter scenarios: active guests only (deleted=false), soft-deleted guests only (deleted=true), and all guests (deleted omitted). Ensures the API correctly accepts and processes the deleted parameter for administrative monitoring and cleanup operations.
 *
 * Since guest accounts are created automatically by the system when anonymous users visit, this test validates the filtering API behavior with existing guest data in the system.
 *
 * 1. Lists guests with deleted=false filter to retrieve only active guests.
 * 2. Lists guests with deleted=true filter to retrieve only soft-deleted guests.
 * 3. Lists guests without deleted filter to retrieve all guests.
 * 4. Validates response structure and pagination metadata for all three scenarios.
 */
export async function test_api_guest_list_deletion_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test deleted=false - active guests only
  const activeGuests = await api.functional.redditCommunity.guests.index(
    connection,
    {
      body: {
        deleted: false,
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityGuest.IRequest,
    },
  );
  typia.assert(activeGuests);
  // 2. Test deleted=true - soft-deleted guests only
  const deletedGuests = await api.functional.redditCommunity.guests.index(
    connection,
    {
      body: {
        deleted: true,
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityGuest.IRequest,
    },
  );
  typia.assert(deletedGuests);
  // 3. Test deleted omitted - all guests
  const allGuests = await api.functional.redditCommunity.guests.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityGuest.IRequest,
    },
  );
  typia.assert(allGuests);
  // 4. Validate pagination metadata relationships
  TestValidator.predicate(
    "active guests pages calculated correctly",
    activeGuests.pagination.pages ===
      Math.ceil(
        activeGuests.pagination.records / activeGuests.pagination.limit,
      ),
  );
  TestValidator.predicate(
    "deleted guests pages calculated correctly",
    deletedGuests.pagination.pages ===
      Math.ceil(
        deletedGuests.pagination.records / deletedGuests.pagination.limit,
      ),
  );
  TestValidator.predicate(
    "all guests pages calculated correctly",
    allGuests.pagination.pages ===
      Math.ceil(allGuests.pagination.records / allGuests.pagination.limit),
  );
  // 5. Validate data array length matches records on first page
  TestValidator.predicate(
    "active guests data length within limit",
    activeGuests.data.length <= activeGuests.pagination.limit,
  );
  TestValidator.predicate(
    "deleted guests data length within limit",
    deletedGuests.data.length <= deletedGuests.pagination.limit,
  );
  TestValidator.predicate(
    "all guests data length within limit",
    allGuests.data.length <= allGuests.pagination.limit,
  );
  // 6. Validate total records relationship (all >= active + deleted)
  TestValidator.predicate(
    "all guests records >= active guests records",
    allGuests.pagination.records >= activeGuests.pagination.records,
  );
  TestValidator.predicate(
    "all guests records >= deleted guests records",
    allGuests.pagination.records >= deletedGuests.pagination.records,
  );
}
