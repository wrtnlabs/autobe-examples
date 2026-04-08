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

export async function test_api_guest_accounts_soft_delete_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Fetch all accounts (deleted_at: null)
  const allGuests = await api.functional.redditCommunity.guests.index(
    connection,
    {
      body: { deleted_at: null } satisfies IRedditCommunityGuest.IRequest,
    },
  );
  typia.assert(allGuests);
  // 2. Fetch only soft-deleted accounts (deleted_at: true)
  const deletedGuests = await api.functional.redditCommunity.guests.index(
    connection,
    {
      body: { deleted_at: true } satisfies IRedditCommunityGuest.IRequest,
    },
  );
  typia.assert(deletedGuests);
  // 3. Fetch only active accounts (deleted_at: false)
  const activeGuests = await api.functional.redditCommunity.guests.index(
    connection,
    {
      body: { deleted_at: false } satisfies IRedditCommunityGuest.IRequest,
    },
  );
  typia.assert(activeGuests);
  // 4. Verify total count equals sum of deleted + active
  TestValidator.equals(
    "total records match sum of deleted and active",
    allGuests.pagination.records,
    deletedGuests.pagination.records + activeGuests.pagination.records,
  );
  // 5. Verify all deleted accounts have non-null deleted_at
  const allDeletedHaveTimestamp = deletedGuests.data.every(
    (guest) => guest.deleted_at !== null,
  );
  TestValidator.predicate(
    "all deleted guests have non-null deleted_at",
    allDeletedHaveTimestamp,
  );
  // 6. Verify all active accounts have null deleted_at
  const allActiveAreNull = activeGuests.data.every(
    (guest) => guest.deleted_at === null,
  );
  TestValidator.predicate(
    "all active guests have null deleted_at",
    allActiveAreNull,
  );
  // 7. Verify pagination records match actual data length
  TestValidator.equals(
    "deleted pagination records match data length",
    deletedGuests.data.length,
    deletedGuests.pagination.records,
  );
  TestValidator.equals(
    "active pagination records match data length",
    activeGuests.data.length,
    activeGuests.pagination.records,
  );
  // 8. Verify deleted and active sets are disjoint (no overlap)
  const deletedIds = new Set(deletedGuests.data.map((g) => g.id));
  const activeIds = new Set(activeGuests.data.map((g) => g.id));
  const overlap = deletedIds.intersection(activeIds);
  TestValidator.predicate(
    "deleted and active sets are disjoint",
    overlap.size === 0,
  );
}
