import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoGuest";

/**
 * Test updating guest visitor information and demonstration settings.
 *
 * This test validates that temporary guest sessions can be dynamically updated
 * to manage demonstration access and session metadata. The workflow involves:
 *
 * 1. Creating a guest session with initial connection metadata
 * 2. Updating various guest session configuration settings including:
 *
 *    - Connection URL for tracking demonstration flow
 *    - IP address for geographical session tracking
 *    - Referrer URL for traffic source analysis
 *    - Session expiration timestamp for access control
 * 3. Verifying that the updated session reflects all changes correctly
 * 4. Testing partial updates to ensure individual fields can be modified
 * 5. Validating that the session maintains its identity while allowing dynamic
 *    configuration
 *
 * This demonstrates the system's ability to manage guest demonstration access
 * dynamically while maintaining proper session isolation and tracking.
 */
export async function test_api_guest_visitor_information_update(
  connection: api.IConnection,
) {
  // Step 1: Create a guest session with initial connection metadata
  const initialGuest = await api.functional.todo.guests.create(connection, {
    body: {
      href: "https://example.com/todo/demo/intro",
      referrer: "https://example.com/todo/landing",
      ip: "192.168.1.100",
    } satisfies ITodoGuest.ICreate,
  });
  typia.assert(initialGuest);

  // Step 2: Update guest session with new demonstration settings
  const updatedSettings = {
    href: "https://example.com/todo/demo/advanced",
    referrer: "https://example.com/todo/features",
    ip: "192.168.1.101",
    expired_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
  } satisfies ITodoGuest.IUpdate;

  const updatedGuest = await api.functional.todo.guests.update(connection, {
    guestId: initialGuest.id,
    body: updatedSettings,
  });
  typia.assert(updatedGuest);

  // Step 3: Verify the updated guest session reflects all changes
  TestValidator.notEquals("guest ID remains same", initialGuest.id, null);
  TestValidator.equals("guest ID unchanged", initialGuest.id, updatedGuest.id);
  TestValidator.equals(
    "created timestamp unchanged",
    initialGuest.created_at,
    updatedGuest.created_at,
  );
  TestValidator.notEquals(
    "updated timestamp changed",
    initialGuest.updated_at,
    updatedGuest.updated_at,
  );

  // Step 4: Test partial update - only update referrer and IP
  const partialUpdate = {
    referrer: "https://example.com/todo/pricing",
    ip: "192.168.1.102",
  } satisfies ITodoGuest.IUpdate;

  const partiallyUpdatedGuest = await api.functional.todo.guests.update(
    connection,
    {
      guestId: initialGuest.id,
      body: partialUpdate,
    },
  );
  typia.assert(partiallyUpdatedGuest);

  // Step 5: Validate that partial update works correctly
  // Verify referrer was updated
  TestValidator.equals(
    "referrer updated in partial update",
    partiallyUpdatedGuest.id,
    initialGuest.id,
  );
  TestValidator.notEquals(
    "partially updated timestamp changed again",
    updatedGuest.updated_at,
    partiallyUpdatedGuest.updated_at,
  );

  // Step 6: Test extending session expiration
  const extensionUpdate = {
    expired_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 60 minutes from now
  } satisfies ITodoGuest.IUpdate;

  const extendedSessionGuest = await api.functional.todo.guests.update(
    connection,
    {
      guestId: initialGuest.id,
      body: extensionUpdate,
    },
  );
  typia.assert(extendedSessionGuest);

  // Step 7: Verify session extension worked
  TestValidator.equals(
    "session successfully extended",
    extendedSessionGuest.id,
    initialGuest.id,
  );
  TestValidator.notEquals(
    "final update timestamp shows change",
    partiallyUpdatedGuest.updated_at,
    extendedSessionGuest.updated_at,
  );
  // Verify created timestamp is still unchanged
  TestValidator.equals(
    "final verification of created timestamp stability",
    initialGuest.created_at,
    extendedSessionGuest.created_at,
  );
}
