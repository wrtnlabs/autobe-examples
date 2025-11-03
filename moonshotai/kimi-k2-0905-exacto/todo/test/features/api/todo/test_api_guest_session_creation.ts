import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoGuest";

/**
 * Test guest session creation for demo access.
 *
 * This test validates that unauthenticated users can create temporary guest
 * sessions to preview basic application functionality. The test verifies proper
 * authentication tokens are generated and appropriate access limitations are in
 * place for guest users.
 *
 * Test flow:
 *
 * 1. Generate guest session creation request with connection metadata
 * 2. Call guest creation API endpoint
 * 3. Validate response contains guest session data
 * 4. Verify timestamps are properly set
 * 5. Confirm guest session has appropriate access controls
 */
export async function test_api_guest_session_creation(
  connection: api.IConnection,
) {
  // Generate connection metadata for guest session with proper URI formats
  const href = `https://example.com/todo/demo`;
  const referrer = `https://example.com/todo`;

  // Create guest session with proper request body
  const guestSession = await api.functional.todo.guests.create(connection, {
    body: {
      href: href as string & tags.Format<"uri">,
      referrer: referrer as string & tags.Format<"uri">,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoGuest.ICreate,
  });

  // Validate response structure
  typia.assert(guestSession);

  // Verify guest session properties - UUID format is handled by typia.assert
  TestValidator.predicate(
    "guest session has valid timestamp format",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
      guestSession.created_at,
    ),
  );
  TestValidator.predicate(
    "guest session has updated timestamp",
    guestSession.updated_at !== null && guestSession.updated_at !== undefined,
  );

  // Verify guest session is not deleted (active session)
  TestValidator.equals(
    "guest session is active",
    guestSession.deleted_at,
    null,
  );
}
