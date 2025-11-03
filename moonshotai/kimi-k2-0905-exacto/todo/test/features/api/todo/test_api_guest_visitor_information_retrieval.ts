import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoGuest";

/**
 * Test the retrieval of guest visitor information.
 *
 * This test validates that temporary guest sessions can be accessed and viewed,
 * ensuring the system properly manages anonymous preview access. The test
 * creates a guest session first as a prerequisite, then retrieves the guest
 * information to verify proper session creation and data integrity.
 *
 * 1. Create a new guest session using realistic connection data
 * 2. Verify the guest session creation response contains all expected properties
 * 3. Retrieve guest information using the guest ID from creation
 * 4. Validate the retrieved guest data matches the created session
 * 5. Ensure data integrity by comparing timestamps and session IDs
 */
export async function test_api_guest_visitor_information_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create a new guest session with realistic connection data
  const createBody = {
    href: "https://todo.example.com/demo",
    referrer: "https://search.example.com",
    ip: "203.0.113.42",
  } satisfies ITodoGuest.ICreate;

  const createdGuest = await api.functional.todo.guests.create(connection, {
    body: createBody,
  });

  // Step 2: Verify the guest session creation response
  typia.assert(createdGuest);
  TestValidator.predicate("Guest has valid creation timestamp", () => {
    return !isNaN(Date.parse(createdGuest.created_at));
  });
  TestValidator.predicate("Guest has valid update timestamp", () => {
    return !isNaN(Date.parse(createdGuest.updated_at));
  });

  // Step 3: Retrieve guest information using the guest ID
  const retrievedGuest = await api.functional.todo.guests.at(connection, {
    guestId: createdGuest.id,
  });

  // Step 4: Validate the retrieved guest data matches the created session
  typia.assert(retrievedGuest);
  TestValidator.equals(
    "Retrieved guest ID matches created ID",
    retrievedGuest.id,
    createdGuest.id,
  );
  TestValidator.equals(
    "Retrieved created_at matches created created_at",
    retrievedGuest.created_at,
    createdGuest.created_at,
  );
  TestValidator.equals(
    "Retrieved updated_at matches created updated_at",
    retrievedGuest.updated_at,
    createdGuest.updated_at,
  );

  // Step 5: Data integrity validation
  TestValidator.equals(
    "Retrieved guest should not be deleted",
    retrievedGuest.deleted_at,
    null,
  );
  TestValidator.predicate("Updated_at should not be before created_at", () => {
    return (
      new Date(retrievedGuest.updated_at).getTime() >=
      new Date(retrievedGuest.created_at).getTime()
    );
  });
}
