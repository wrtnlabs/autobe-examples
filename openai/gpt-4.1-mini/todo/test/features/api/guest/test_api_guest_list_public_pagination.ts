import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuest";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
/**
 * Test retrieving a paginated list of guest users without any filters.
 *
 * This test ensures public accessibility of the guest list retrieval endpoint
 * and validates the structure and correctness of the paginated response. It
 * checks that the default page of results is returned with proper pagination
 * information and that guest summary details conform to expected formats.
 *
 * Steps:
 *
 * 1. Call the PATCH /todoApp/guests endpoint with an empty filter object to fetch
 *    the public paginated guest list.
 * 2. Assert the response matches the IPageITodoAppGuest.ISummary DTO.
 * 3. Validate pagination data properties such as current page, limit, total
 *    records, and total pages for reasonableness.
 * 4. Confirm each guest summary item properties are in correct format, including
 *    UUID and ISO date-time strings.
 */
export async function test_api_guest_list_public_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Call the endpoint without filters to get default guest list page
  const response: IPageITodoAppGuest.ISummary =
    await api.functional.todoApp.guests.index(connection, {
      body: {}, // Empty filter for default pagination
    });
  // Step 2: Validate response structure using type assertions
  typia.assert(response);
  // Step 3: Validate pagination info for logical correctness
  const { pagination } = response;
  TestValidator.predicate(
    "pagination current page is positive",
    pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit is positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination pages is positive",
    pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  // Step 4: Validate each guest summary item
  for (const guest of response.data) {
    typia.assert(guest); // Confirm each is valid ITodoAppGuest.ISummary
    // Validate UUID format for id
    TestValidator.predicate(
      `guest id ${guest.id} is valid UUID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        guest.id,
      ),
    );
    // Validate guest_identifier is non-empty
    TestValidator.predicate(
      `guest_identifier for id ${guest.id} is non-empty`,
      typeof guest.guest_identifier === "string" &&
        guest.guest_identifier.length > 0,
    );
    // Validate created_at ISO 8601 format
    TestValidator.predicate(
      `guest created_at for id ${guest.id} is ISO date-time`,
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$/.test(guest.created_at),
    );
    // Optional updated_at and deleted_at should be null, undefined, or ISO 8601
    if (guest.updated_at !== null && guest.updated_at !== undefined) {
      TestValidator.predicate(
        `guest updated_at for id ${guest.id} is ISO date-time or null`,
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$/.test(guest.updated_at),
      );
    }
    if (guest.deleted_at !== null && guest.deleted_at !== undefined) {
      TestValidator.predicate(
        `guest deleted_at for id ${guest.id} is ISO date-time or null`,
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$/.test(guest.deleted_at),
      );
    }
  }
}
