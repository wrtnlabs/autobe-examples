import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuest";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test guest listing with soft-delete status filtering.
 *
 * This test verifies the deleted parameter correctly filters guests by their deletion status.
 * Three scenarios are tested:
 * 1. deleted=true returns only soft-deleted guests (deleted_at IS NOT NULL)
 * 2. deleted=false returns only active guests (deleted_at IS NULL)
 * 3. deleted omitted returns both active and deleted guests
 *
 * Each scenario validates that the response includes appropriate guests for the filter state
 * and pagination metadata reflects the correct filtered counts.
 */
export async function test_api_guest_list_soft_delete_filter(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario 1: deleted=true - should return only soft-deleted guests
  const deletedOnlyResponse = await api.functional.todoApp.guests.index(
    connection,
    {
      body: {
        deleted: true,
        limit: 100,
      } satisfies ITodoAppGuest.IRequest,
    },
  );
  typia.assert(deletedOnlyResponse);
  // Verify all returned guests have deleted_at not null
  for (const guest of deletedOnlyResponse.data) {
    TestValidator.predicate(
      "deleted guests should have deleted_at",
      guest.deleted_at !== null,
    );
  }
  // Test scenario 2: deleted=false - should return only active guests
  const activeOnlyResponse = await api.functional.todoApp.guests.index(
    connection,
    {
      body: {
        deleted: false,
        limit: 100,
      } satisfies ITodoAppGuest.IRequest,
    },
  );
  typia.assert(activeOnlyResponse);
  // Verify all returned guests have deleted_at as null
  for (const guest of activeOnlyResponse.data) {
    TestValidator.predicate(
      "active guests should have deleted_at null",
      guest.deleted_at === null,
    );
  }
  // Test scenario 3: deleted omitted - should return both active and deleted guests
  const allGuestsResponse = await api.functional.todoApp.guests.index(
    connection,
    {
      body: {
        limit: 100,
      } satisfies ITodoAppGuest.IRequest,
    },
  );
  typia.assert(allGuestsResponse);
  // Verify pagination metadata is valid
  TestValidator.predicate(
    "pagination records should be non-negative",
    allGuestsResponse.pagination.records >= 0,
  );
  // Verify that all guests response count is >= either filtered count
  TestValidator.predicate(
    "all guests count should be >= deleted only count",
    allGuestsResponse.pagination.records >=
      deletedOnlyResponse.pagination.records,
  );
  TestValidator.predicate(
    "all guests count should be >= active only count",
    allGuestsResponse.pagination.records >=
      activeOnlyResponse.pagination.records,
  );
}
