import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListSystemSetting";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemSetting";

/**
 * E2E test for administrative system settings full-listing, filtering, sorting,
 * and pagination.
 *
 * 1. Register a new admin and assert authorization was granted.
 * 2. Issue PATCH /todoList/admin/systemSettings without filters for generic
 *    listing.
 * 3. Issue systemSettings listings with filter by partial key substring.
 * 4. Issue listings by description substring filter.
 * 5. Issue listing with pagination params (page, limit), check logical pagination.
 * 6. Issue listings with sorting by supported fields in both asc/desc order.
 * 7. Confirm all returned records have required fields (id, key, value,
 *    description).
 * 8. Confirm authentication enforcement: cannot list settings unauthenticated.
 */
export async function test_api_system_settings_admin_list_filter_pagination(
  connection: api.IConnection,
) {
  // Step 1: Register admin and assert auth
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email: adminEmail,
    password: adminPassword satisfies string,
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ITodoListAdmin.IJoin;

  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(admin);

  // Step 2: Generic listing (no filters)
  const generalResult: IPageITodoListSystemSetting.ISummary =
    await api.functional.todoList.admin.systemSettings.index(connection, {
      body: {} satisfies ITodoListSystemSetting.IRequest,
    });
  typia.assert(generalResult);
  TestValidator.predicate(
    "no filter: at least one setting exists",
    generalResult.data.length > 0,
  );
  for (const setting of generalResult.data) {
    TestValidator.predicate(
      "setting id is non-empty",
      typeof setting.id === "string" && setting.id.length > 0,
    );
    TestValidator.predicate(
      "setting key is non-empty",
      typeof setting.key === "string" && setting.key.length > 0,
    );
    TestValidator.predicate(
      "setting value is string",
      typeof setting.value === "string",
    );
    // description is optional
  }

  // Step 3: Filter by partial key substring (if any setting exists)
  if (generalResult.data.length > 0) {
    const pickedKey = generalResult.data[0].key;
    const keySub = pickedKey.substring(
      0,
      Math.max(1, Math.floor(pickedKey.length / 2)),
    );
    const keyFilterResult =
      await api.functional.todoList.admin.systemSettings.index(connection, {
        body: { key: keySub } satisfies ITodoListSystemSetting.IRequest,
      });
    typia.assert(keyFilterResult);
    TestValidator.predicate(
      "key filter returned at least one record",
      keyFilterResult.data.length > 0,
    );
    for (const r of keyFilterResult.data) {
      TestValidator.predicate(
        "key matches partial filter",
        r.key.includes(keySub),
      );
    }
  }

  // Step 4: Filter by partial description substring (if description present)
  const withDesc = generalResult.data.find(
    (v) =>
      v.description &&
      typeof v.description === "string" &&
      v.description.length > 0,
  );
  if (withDesc && typeof withDesc.description === "string") {
    const descSub = withDesc.description.substring(
      0,
      Math.max(1, Math.floor(withDesc.description.length / 2)),
    );
    const descFilterResult =
      await api.functional.todoList.admin.systemSettings.index(connection, {
        body: {
          description: descSub,
        } satisfies ITodoListSystemSetting.IRequest,
      });
    typia.assert(descFilterResult);
    TestValidator.predicate(
      "desc filter returned records",
      descFilterResult.data.length > 0,
    );
    for (const r of descFilterResult.data) {
      TestValidator.predicate(
        "desc contains query",
        typeof r.description === "string" && r.description.includes(descSub),
      );
    }
  }

  // Step 5: Pagination logic (page/limit)
  // Use limit 1 for forced pagination test
  const limit = 1 satisfies number;
  const paginatedResult1 =
    await api.functional.todoList.admin.systemSettings.index(connection, {
      body: { limit, page: 1 } satisfies ITodoListSystemSetting.IRequest,
    });
  typia.assert(paginatedResult1);
  TestValidator.equals(
    "pagination limit respected",
    paginatedResult1.data.length,
    limit,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedResult1.pagination.current,
    1,
  );

  // If there are more than one record, test page 2
  if (generalResult.data.length > 1) {
    const paginatedResult2 =
      await api.functional.todoList.admin.systemSettings.index(connection, {
        body: { limit, page: 2 } satisfies ITodoListSystemSetting.IRequest,
      });
    typia.assert(paginatedResult2);
    TestValidator.equals(
      "pagination current page 2",
      paginatedResult2.pagination.current,
      2,
    );
  }

  // Step 6: Sorting
  for (const sort_by of ["key", "created_at", "updated_at"] as const) {
    for (const order of ["asc", "desc"] as const) {
      const sortResult =
        await api.functional.todoList.admin.systemSettings.index(connection, {
          body: { sort_by, order } satisfies ITodoListSystemSetting.IRequest,
        });
      typia.assert(sortResult);
      // Do not fail if only one: sorting check is only meaningful for >1
      if (sortResult.data.length > 1) {
        for (let i = 1; i < sortResult.data.length; ++i) {
          if (sort_by === "key") {
            if (order === "asc") {
              TestValidator.predicate(
                `key asc sort (i=${i})`,
                sortResult.data[i - 1].key.localeCompare(
                  sortResult.data[i].key,
                ) <= 0,
              );
            } else {
              TestValidator.predicate(
                `key desc sort (i=${i})`,
                sortResult.data[i - 1].key.localeCompare(
                  sortResult.data[i].key,
                ) >= 0,
              );
            }
          }
          // For created_at, updated_at, we can't check (not returned by ISummary), skip check.
        }
      }
    }
  }

  // Step 7: Must enforce that unauthenticated/other users cannot list settings
  // Remove all headers to simulate unauthenticated call
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated cannot list settings",
    async () => {
      await api.functional.todoList.admin.systemSettings.index(unauthConn, {
        body: {} as ITodoListSystemSetting.IRequest,
      });
    },
  );
}
