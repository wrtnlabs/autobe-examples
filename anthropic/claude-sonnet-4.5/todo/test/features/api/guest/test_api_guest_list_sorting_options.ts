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
 * Test that an admin can sort guest records by different fields and sort
 * orders.
 *
 * This test validates the sort_by and sort_order functionality for organizing
 * visitor data.
 *
 * Steps:
 *
 * 1. Admin authenticates
 * 2. Admin retrieves guest list with sort_by parameter set to 'created_at' in
 *    ascending order
 * 3. Validate results are correctly ordered by created_at ascending
 * 4. Admin retrieves guest list with sort_by parameter set to 'created_at' in
 *    descending order
 * 5. Validate results are correctly ordered by created_at descending
 * 6. Admin retrieves guest list with sort_by parameter set to 'ip_address' in
 *    ascending order
 * 7. Validate results are correctly ordered by ip_address ascending
 * 8. Admin retrieves guest list with sort_by parameter set to 'ip_address' in
 *    descending order
 * 9. Validate results are correctly ordered by ip_address descending
 */
export async function test_api_guest_list_sorting_options(
  connection: api.IConnection,
) {
  // Step 1: Admin authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Retrieve guest list sorted by created_at in ascending order
  const sortByCreatedAtAsc: IPageITodoListGuest.ISummary =
    await api.functional.todoList.admin.guests.index(connection, {
      body: {
        sort_by: "created_at",
        sort_order: "asc",
      } satisfies ITodoListGuest.IRequest,
    });
  typia.assert(sortByCreatedAtAsc);

  // Step 3: Validate results are ordered by created_at ascending
  if (sortByCreatedAtAsc.data.length > 1) {
    for (let i = 0; i < sortByCreatedAtAsc.data.length - 1; i++) {
      const current = new Date(sortByCreatedAtAsc.data[i].created_at).getTime();
      const next = new Date(
        sortByCreatedAtAsc.data[i + 1].created_at,
      ).getTime();
      TestValidator.predicate(
        "created_at ascending order is correct",
        current <= next,
      );
    }
  }

  // Step 4: Retrieve guest list sorted by created_at in descending order
  const sortByCreatedAtDesc: IPageITodoListGuest.ISummary =
    await api.functional.todoList.admin.guests.index(connection, {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies ITodoListGuest.IRequest,
    });
  typia.assert(sortByCreatedAtDesc);

  // Step 5: Validate results are ordered by created_at descending
  if (sortByCreatedAtDesc.data.length > 1) {
    for (let i = 0; i < sortByCreatedAtDesc.data.length - 1; i++) {
      const current = new Date(
        sortByCreatedAtDesc.data[i].created_at,
      ).getTime();
      const next = new Date(
        sortByCreatedAtDesc.data[i + 1].created_at,
      ).getTime();
      TestValidator.predicate(
        "created_at descending order is correct",
        current >= next,
      );
    }
  }

  // Step 6: Retrieve guest list sorted by ip_address in ascending order
  const sortByIpAddressAsc: IPageITodoListGuest.ISummary =
    await api.functional.todoList.admin.guests.index(connection, {
      body: {
        sort_by: "ip_address",
        sort_order: "asc",
      } satisfies ITodoListGuest.IRequest,
    });
  typia.assert(sortByIpAddressAsc);

  // Step 7: Validate results are ordered by ip_address ascending (alphabetically)
  if (sortByIpAddressAsc.data.length > 1) {
    for (let i = 0; i < sortByIpAddressAsc.data.length - 1; i++) {
      const currentIp = sortByIpAddressAsc.data[i].ip_address ?? "";
      const nextIp = sortByIpAddressAsc.data[i + 1].ip_address ?? "";
      TestValidator.predicate(
        "ip_address ascending order is correct",
        currentIp <= nextIp,
      );
    }
  }

  // Step 8: Retrieve guest list sorted by ip_address in descending order
  const sortByIpAddressDesc: IPageITodoListGuest.ISummary =
    await api.functional.todoList.admin.guests.index(connection, {
      body: {
        sort_by: "ip_address",
        sort_order: "desc",
      } satisfies ITodoListGuest.IRequest,
    });
  typia.assert(sortByIpAddressDesc);

  // Step 9: Validate results are ordered by ip_address descending (alphabetically)
  if (sortByIpAddressDesc.data.length > 1) {
    for (let i = 0; i < sortByIpAddressDesc.data.length - 1; i++) {
      const currentIp = sortByIpAddressDesc.data[i].ip_address ?? "";
      const nextIp = sortByIpAddressDesc.data[i + 1].ip_address ?? "";
      TestValidator.predicate(
        "ip_address descending order is correct",
        currentIp >= nextIp,
      );
    }
  }
}
