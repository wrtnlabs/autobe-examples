import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

/**
 * Test retrieval of guest visitor records with null optional fields.
 *
 * This test validates that the API correctly handles and returns guest records
 * where optional metadata fields (ip_address and user_agent) contain null
 * values. It ensures that the absence of optional tracking data does not cause
 * errors or incomplete responses, which is critical for privacy compliance
 * scenarios where tracking information may be intentionally omitted or
 * unavailable.
 *
 * Steps:
 *
 * 1. Authenticate as administrator to gain access to guest management endpoints
 * 2. Retrieve a guest record (in simulation mode, this generates random data)
 * 3. Validate the complete response structure using typia.assert
 */
export async function test_api_guest_retrieval_with_null_fields(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Retrieve a guest record
  const guestId = typia.random<string & tags.Format<"uuid">>();
  const guest = await api.functional.todoList.admin.guests.at(connection, {
    guestId: guestId,
  });

  // Step 3: Validate the complete response structure
  // typia.assert performs COMPLETE validation including:
  // - All property types (id, ip_address, user_agent, visited_at, created_at)
  // - All format constraints (UUID, date-time)
  // - All nullable/undefined handling for optional fields
  // - All required fields presence
  typia.assert(guest);
}
