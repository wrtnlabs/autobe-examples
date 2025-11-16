import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListGuest";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

/**
 * Test IP address filtering for guest visitor records.
 *
 * Validates that administrators can filter guest records by specific IP address
 * patterns for security monitoring and visitor tracking purposes. This test
 * ensures that the IP filtering mechanism works correctly and returns only
 * matching records while maintaining proper pagination structure.
 *
 * Test workflow:
 *
 * 1. Admin authenticates to obtain necessary permissions
 * 2. Perform initial search to get available guest records
 * 3. Select a specific IP address from existing guests
 * 4. Filter guests by that specific IP address
 * 5. Validate that all returned records match the specified IP
 * 6. Verify pagination metadata is correct
 * 7. Test with non-existent IP to ensure proper empty results
 */
export async function test_api_guest_list_filtering_by_ip_address(
  connection: api.IConnection,
) {
  // Step 1: Admin authentication
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      ip: "192.168.1.100",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Get initial list of guests without filters to see what's available
  const allGuestsPage = await api.functional.todoList.admin.guests.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoListGuest.IRequest,
    },
  );
  typia.assert(allGuestsPage);

  // Step 3: If there are guests with IP addresses, test filtering
  if (allGuestsPage.data.length > 0) {
    // Find a guest with a non-null IP address
    const guestWithIp = allGuestsPage.data.find(
      (guest) => guest.ip_address !== null && guest.ip_address !== undefined,
    );

    if (guestWithIp) {
      const targetIp = typia.assert(guestWithIp.ip_address!);

      // Step 4: Filter by specific IP address
      const filteredPage = await api.functional.todoList.admin.guests.index(
        connection,
        {
          body: {
            page: 1,
            limit: 50,
            ip_address: targetIp,
          } satisfies ITodoListGuest.IRequest,
        },
      );
      typia.assert(filteredPage);

      // Step 5: Validate all returned guests match the filtered IP
      TestValidator.predicate(
        "filtered results should not be empty",
        filteredPage.data.length > 0,
      );

      for (const guest of filteredPage.data) {
        TestValidator.equals(
          "guest IP should match filter",
          guest.ip_address,
          targetIp,
        );
      }

      // Step 6: Verify pagination structure is valid
      TestValidator.predicate(
        "pagination current page should be 1",
        filteredPage.pagination.current === 1,
      );
      TestValidator.predicate(
        "pagination limit should match request",
        filteredPage.pagination.limit === 50,
      );
      TestValidator.predicate(
        "pagination records should match data length",
        filteredPage.pagination.records >= filteredPage.data.length,
      );
    }
  }

  // Step 7: Test with a non-existent IP address to ensure empty results
  const nonExistentIp = "255.255.255.254";
  const emptyPage = await api.functional.todoList.admin.guests.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        ip_address: nonExistentIp,
      } satisfies ITodoListGuest.IRequest,
    },
  );
  typia.assert(emptyPage);

  // Validate that results are empty or only contain exact matches
  if (emptyPage.data.length > 0) {
    for (const guest of emptyPage.data) {
      TestValidator.equals(
        "non-existent IP filter should only return exact matches",
        guest.ip_address,
        nonExistentIp,
      );
    }
  }
}
