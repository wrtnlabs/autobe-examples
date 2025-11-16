import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemSettings";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSystemSettings";

/**
 * Validates administrator access to the system settings search endpoint with
 * pagination and filtering.
 *
 * This test verifies that an authenticated administrator can successfully
 * perform advanced search operations on global system settings, including key
 * partial search, creation date window filtering, pagination, soft-deletion
 * filtering, and sort order variations.
 *
 * 1. Register a new system administrator using valid unique credentials via the
 *    join endpoint and receive authentication tokens.
 * 2. Query the system settings endpoint with no filters, asserting that a
 *    paginated list is returned with valid page metadata and all fields are
 *    type-correct.
 * 3. Issue a partial key search (e.g. first 3 chars of requested key) and verify
 *    results contain only matching records.
 * 4. Filter by a created_at date window—only settings within the window are
 *    included.
 * 5. Filter for soft-deleted settings and confirm only such records are present if
 *    any.
 * 6. Test both ascending and descending sort orders (by key and created_at),
 *    confirming order correctness.
 * 7. Attempt requesting the endpoint with an unauthenticated connection and assert
 *    that access is denied or an error is thrown.
 */
export async function test_api_system_settings_search_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register a new administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // 2. Query system settings with no filters
  const allSettings =
    await api.functional.communityPlatform.administrator.systemSettings.index(
      connection,
      {
        body: {} satisfies ICommunityPlatformSystemSettings.IRequest,
      },
    );
  typia.assert(allSettings);
  TestValidator.predicate(
    "system settings pagination structure",
    typeof allSettings.pagination.current === "number" &&
      allSettings.pagination.current >= 0,
  );
  TestValidator.predicate(
    "system settings is array",
    Array.isArray(allSettings.data),
  );

  // 3. Partial key search if there is at least one setting
  if (allSettings.data.length > 0) {
    const sample = allSettings.data[0];
    typia.assert(sample);
    const partialKey = sample.key.substring(
      0,
      Math.max(1, Math.floor(sample.key.length / 2)),
    );
    const filtered =
      await api.functional.communityPlatform.administrator.systemSettings.index(
        connection,
        {
          body: {
            key: partialKey,
          } satisfies ICommunityPlatformSystemSettings.IRequest,
        },
      );
    typia.assert(filtered);
    TestValidator.predicate(
      "all keys match partial",
      filtered.data.every((s) => s.key.includes(partialKey)),
    );
  }

  // 4. Filter by creation date window
  if (allSettings.data.length > 0) {
    // Choose start and end dates based on available data
    const sortByCreated = [...allSettings.data].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    );
    const from = sortByCreated[0].created_at;
    const to = sortByCreated[sortByCreated.length - 1].created_at;
    if (from !== to) {
      const midIndex = Math.floor(sortByCreated.length / 2);
      const fromWindow = sortByCreated[midIndex - 1]?.created_at ?? from;
      const toWindow = sortByCreated[midIndex]?.created_at ?? to;
      const dateWindowResult =
        await api.functional.communityPlatform.administrator.systemSettings.index(
          connection,
          {
            body: {
              created_from: fromWindow,
              created_to: toWindow,
            } satisfies ICommunityPlatformSystemSettings.IRequest,
          },
        );
      typia.assert(dateWindowResult);
      TestValidator.predicate(
        "all created_at within window",
        dateWindowResult.data.every(
          (s) => s.created_at >= fromWindow && s.created_at <= toWindow,
        ),
      );
    }
  }

  // 5. Filter for soft-deleted settings (deleted is true)
  const deletedOnly =
    await api.functional.communityPlatform.administrator.systemSettings.index(
      connection,
      {
        body: {
          deleted: true,
        } satisfies ICommunityPlatformSystemSettings.IRequest,
      },
    );
  typia.assert(deletedOnly);
  TestValidator.predicate(
    "all are deleted or deleted_at is present",
    deletedOnly.data.every(
      (s) => s.deleted_at !== null && s.deleted_at !== undefined,
    ),
  );

  // 6. Test sort orders (by key ascending/descending)
  for (const sortBy of ["key", "created_at"] as const) {
    for (const sortDir of ["asc", "desc"] as const) {
      const sortResult =
        await api.functional.communityPlatform.administrator.systemSettings.index(
          connection,
          {
            body: {
              sort_by: sortBy,
              sort_direction: sortDir,
            } satisfies ICommunityPlatformSystemSettings.IRequest,
          },
        );
      typia.assert(sortResult);
      if (sortResult.data.length > 1) {
        const arr = sortResult.data;
        if (sortBy === "key") {
          const isSorted = arr.every(
            (v, i, a) =>
              i === 0 ||
              (sortDir === "asc"
                ? v.key >= a[i - 1].key
                : v.key <= a[i - 1].key),
          );
          TestValidator.predicate(`keys sorted ${sortDir}`, isSorted);
        } else if (sortBy === "created_at") {
          const isSorted = arr.every(
            (v, i, a) =>
              i === 0 ||
              (sortDir === "asc"
                ? v.created_at >= a[i - 1].created_at
                : v.created_at <= a[i - 1].created_at),
          );
          TestValidator.predicate(`created_at sorted ${sortDir}`, isSorted);
        }
      }
    }
  }

  // 7. Attempt with unauthenticated connection and expect failure
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access is rejected", async () => {
    await api.functional.communityPlatform.administrator.systemSettings.index(
      unauthConn,
      {
        body: {} satisfies ICommunityPlatformSystemSettings.IRequest,
      },
    );
  });
}
