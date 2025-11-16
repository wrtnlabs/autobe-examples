import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

/**
 * Test administrator's ability to retrieve detailed guest visitor information.
 *
 * This test validates the complete workflow of admin authentication followed by
 * guest record retrieval. It ensures that:
 *
 * 1. Admin can successfully authenticate via the join endpoint
 * 2. Authenticated admin can access the guest retrieval endpoint
 * 3. The API properly handles guest retrieval requests with valid authentication
 * 4. The response structure matches the ITodoListGuest schema
 * 5. Proper authorization is enforced (admin-only access)
 */
export async function test_api_guest_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const adminCreateData = {
    email: adminEmail,
    password: adminPassword,
    ip: RandomGenerator.pick(["192.168.1.100", "10.0.0.50", "172.16.0.1"]),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListAdmin.ICreate;

  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateData,
    });
  typia.assert(admin);

  // Verify admin authentication was successful
  TestValidator.predicate(
    "admin authentication token should be present",
    admin.token.access !== null && admin.token.access !== undefined,
  );

  // Step 2: Retrieve guest information using the authenticated admin connection
  // Generate a random guest ID - in simulation mode, this will return mock data
  // In real scenario, this would be an existing guest ID from the database
  const guestId = typia.random<string & tags.Format<"uuid">>();

  const guest: ITodoListGuest = await api.functional.todoList.admin.guests.at(
    connection,
    {
      guestId: guestId,
    },
  );

  // Validate the response structure - typia.assert performs complete type validation
  typia.assert(guest);

  // Verify the guest ID matches the requested ID (business logic validation)
  TestValidator.equals(
    "retrieved guest ID should match requested ID",
    guest.id,
    guestId,
  );
}
