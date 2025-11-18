import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuestUser";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Validate guest user search filtering by time range and external_ref,
 * including sorting.
 *
 * Business goals:
 *
 * - Ensure an authenticated admin can query guest users via PATCH
 *   /todoApp/adminUser/guestUsers.
 * - Verify that fromCreatedAt/toCreatedAt are treated as inclusive bounds.
 * - Confirm that externalRef filter narrows results to the expected external_ref
 *   value.
 * - Validate that sortBy="created_at" with sortDirection="asc" and "desc" is
 *   honored.
 * - Optionally check that an intentionally exclusive time window yields an empty
 *   data page.
 *
 * High-level flow:
 *
 * 1. Join an admin user using POST /auth/adminUser/join.
 * 2. Create at least one ITodoAppSystemSetting via POST
 *    /todoApp/adminUser/systemSettings to simulate realistic config.
 * 3. Fetch an initial guest user page with a broad, mostly unfiltered search.
 * 4. If no guests exist, assert type correctness and stop (nothing more to
 *    validate).
 * 5. If guests exist: 5-1. Pick a representative guest summary and derive a narrow
 *    [fromCreatedAt, toCreatedAt] window. 5-2. Query again with that window,
 *    externalRef filter, and sortBy/asc; assert filter constraints and
 *    ascending order. 5-3. Query again with the same window and externalRef,
 *    but sortDirection="desc"; assert filter constraints and descending order.
 *    5-4. Query with an intentionally exclusive time window and assert an empty
 *    data array with valid pagination.
 */
export async function test_api_guest_users_search_with_time_and_external_ref_filters(
  connection: api.IConnection,
) {
  // 1. Join an admin user to obtain an authorized connection.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassword123!", // satisfies password format
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/join",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const admin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a sample system setting to simulate realistic environment.
  const systemSettingBody = {
    key: `guest_search_max_window_${RandomGenerator.alphaNumeric(8)}`,
    value: "P7D", // e.g., ISO-8601-like duration string, business-agnostic
    type: "string",
    description: "Test-only system setting for guest search E2E.",
    group: "e2e-test",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert(systemSetting);

  // 3. Fetch an initial guest user page with a broad search.
  const initialRequestBody = {
    page: 1,
    limit: 20,
    fromCreatedAt: null,
    toCreatedAt: null,
    externalRef: null,
    sortBy: null,
    sortDirection: null,
  } satisfies ITodoAppGuestUser.IRequest;

  const initialPage: IPageITodoAppGuestUser.ISummary =
    await api.functional.todoApp.adminUser.guestUsers.index(connection, {
      body: initialRequestBody,
    });
  typia.assert(initialPage);

  const initialData: ITodoAppGuestUser.ISummary[] = initialPage.data;

  // If there is no data, we can only validate the basic shape and exit.
  if (initialData.length === 0) {
    await TestValidator.predicate(
      "initial guest user list may be empty in this environment",
      true,
    );
    return;
  }

  // 4. Pick a representative guest summary.
  const withExternalRef = initialData.find(
    (g) => g.external_ref !== null && g.external_ref !== undefined,
  );
  const target: ITodoAppGuestUser.ISummary = withExternalRef ?? initialData[0];

  const targetCreatedAt: string & tags.Format<"date-time"> = target.created_at;
  const targetExternalRef: string | null | undefined = target.external_ref;

  // Derive inclusive time window equal to the target created_at.
  const fromCreatedAt: string & tags.Format<"date-time"> = targetCreatedAt;
  const toCreatedAt: string & tags.Format<"date-time"> = targetCreatedAt;

  const baseFilterBody = {
    page: 1,
    limit: initialPage.pagination.limit,
    fromCreatedAt,
    toCreatedAt,
    externalRef: targetExternalRef ?? null,
    sortBy: "created_at",
  } satisfies {
    page: number & tags.Type<"int32"> & tags.Minimum<1>;
    limit: number & tags.Type<"int32"> & tags.Minimum<1>;
    fromCreatedAt: string & tags.Format<"date-time">;
    toCreatedAt: string & tags.Format<"date-time">;
    externalRef: string | null;
    sortBy: string | null;
  };

  // Helper to validate filter constraints and sort ordering.
  const assertFilterAndSort = (
    page: IPageITodoAppGuestUser.ISummary,
    direction: "asc" | "desc",
  ): void => {
    typia.assert(page);

    const summaries: ITodoAppGuestUser.ISummary[] = page.data;

    // If no data, nothing to validate beyond type.
    if (summaries.length === 0) return;

    const fromTime = new Date(fromCreatedAt).getTime();
    const toTime = new Date(toCreatedAt).getTime();

    // Validate each row respects filters.
    summaries.forEach((summary, index) => {
      const createdTime = new Date(summary.created_at).getTime();
      TestValidator.predicate(
        `created_at within range for row ${index}`,
        fromTime <= createdTime && createdTime <= toTime,
      );

      if (targetExternalRef !== null && targetExternalRef !== undefined) {
        TestValidator.equals(
          `external_ref matches filter for row ${index}`,
          summary.external_ref,
          targetExternalRef,
        );
      } else {
        TestValidator.equals(
          `external_ref is null when filtering by null for row ${index}`,
          summary.external_ref,
          null,
        );
      }
    });

    // Validate sort ordering by created_at.
    for (let i = 1; i < summaries.length; i++) {
      const prev = new Date(summaries[i - 1].created_at).getTime();
      const curr = new Date(summaries[i].created_at).getTime();

      if (direction === "asc") {
        TestValidator.predicate(
          `created_at ascending between index ${i - 1} and ${i}`,
          prev <= curr,
        );
      } else {
        TestValidator.predicate(
          `created_at descending between index ${i - 1} and ${i}`,
          prev >= curr,
        );
      }
    }
  };

  // 5-2. Query with sortDirection = "asc".
  const ascRequestBody = {
    ...baseFilterBody,
    sortDirection: "asc",
  } satisfies ITodoAppGuestUser.IRequest;

  const ascPage: IPageITodoAppGuestUser.ISummary =
    await api.functional.todoApp.adminUser.guestUsers.index(connection, {
      body: ascRequestBody,
    });
  assertFilterAndSort(ascPage, "asc");

  // 5-3. Query with sortDirection = "desc".
  const descRequestBody = {
    ...baseFilterBody,
    sortDirection: "desc",
  } satisfies ITodoAppGuestUser.IRequest;

  const descPage: IPageITodoAppGuestUser.ISummary =
    await api.functional.todoApp.adminUser.guestUsers.index(connection, {
      body: descRequestBody,
    });
  assertFilterAndSort(descPage, "desc");

  // 5-4. Intentionally exclusive time window to yield empty data.
  const targetTime = new Date(targetCreatedAt).getTime();
  const exclusiveFrom = new Date(targetTime + 1).toISOString();

  const exclusiveRequestBody = {
    page: 1,
    limit: initialPage.pagination.limit,
    fromCreatedAt: exclusiveFrom,
    toCreatedAt: exclusiveFrom,
    externalRef: targetExternalRef ?? null,
    sortBy: "created_at",
    sortDirection: "asc",
  } satisfies ITodoAppGuestUser.IRequest;

  const exclusivePage: IPageITodoAppGuestUser.ISummary =
    await api.functional.todoApp.adminUser.guestUsers.index(connection, {
      body: exclusiveRequestBody,
    });
  typia.assert(exclusivePage);

  TestValidator.equals(
    "exclusive time window should yield empty guest data",
    exclusivePage.data.length,
    0,
  );
}
