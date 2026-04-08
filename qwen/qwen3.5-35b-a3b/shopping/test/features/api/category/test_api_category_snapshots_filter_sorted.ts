import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategoriesSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategoriesSnapshot";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCategoriesSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategoriesSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_category_snapshots_filter_sorted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular",
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Use a test category UUID
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test sorting by created_at descending (default behavior)
  const sortedByCreatedDesc =
    await api.functional.ecommerceMall.administrator.categories.snapshots.index(
      adminConnection,
      {
        categoryId,
        body: {
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IEcommerceMallCategoriesSnapshot.IRequest,
      },
    );
  typia.assert(sortedByCreatedDesc);
  // Validate sorting - pagination metadata should match
  TestValidator.equals(
    "snapshots with created_at desc sort count",
    sortedByCreatedDesc.data.length,
    sortedByCreatedDesc.pagination.records,
  );
  // 4. Test sorting by created_at ascending
  const sortedByCreatedAsc =
    await api.functional.ecommerceMall.administrator.categories.snapshots.index(
      adminConnection,
      {
        categoryId,
        body: {
          sort_by: "created_at",
          sort_order: "asc",
        } satisfies IEcommerceMallCategoriesSnapshot.IRequest,
      },
    );
  typia.assert(sortedByCreatedAsc);
  TestValidator.equals(
    "snapshots with created_at asc sort count",
    sortedByCreatedAsc.data.length,
    sortedByCreatedAsc.pagination.records,
  );
  // 5. Test sorting by name
  const sortedByName =
    await api.functional.ecommerceMall.administrator.categories.snapshots.index(
      adminConnection,
      {
        categoryId,
        body: {
          sort_by: "name",
          sort_order: "asc",
        } satisfies IEcommerceMallCategoriesSnapshot.IRequest,
      },
    );
  typia.assert(sortedByName);
  TestValidator.equals(
    "snapshots with name sort count",
    sortedByName.data.length,
    sortedByName.pagination.records,
  );
  // 6. Test sorting by description
  const sortedByDescription =
    await api.functional.ecommerceMall.administrator.categories.snapshots.index(
      adminConnection,
      {
        categoryId,
        body: {
          sort_by: "description",
          sort_order: "desc",
        } satisfies IEcommerceMallCategoriesSnapshot.IRequest,
      },
    );
  typia.assert(sortedByDescription);
  TestValidator.equals(
    "snapshots with description sort count",
    sortedByDescription.data.length,
    sortedByDescription.pagination.records,
  );
  // 7. Test sorting by modified_by_id
  const sortedByModifiedBy =
    await api.functional.ecommerceMall.administrator.categories.snapshots.index(
      adminConnection,
      {
        categoryId,
        body: {
          sort_by: "modified_by_id",
          sort_order: "asc",
        } satisfies IEcommerceMallCategoriesSnapshot.IRequest,
      },
    );
  typia.assert(sortedByModifiedBy);
  TestValidator.equals(
    "snapshots with modified_by_id sort count",
    sortedByModifiedBy.data.length,
    sortedByModifiedBy.pagination.records,
  );
  // 8. Test pagination with limit
  const paginated =
    await api.functional.ecommerceMall.administrator.categories.snapshots.index(
      adminConnection,
      {
        categoryId,
        body: {
          limit: 2,
          page: 1,
        } satisfies IEcommerceMallCategoriesSnapshot.IRequest,
      },
    );
  typia.assert(paginated);
  TestValidator.equals("paginated data length", paginated.data.length, 2);
  TestValidator.equals(
    "pagination records total",
    paginated.pagination.records,
    sortedByCreatedDesc.pagination.records,
  );
  TestValidator.equals(
    "pagination current page",
    paginated.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    paginated.pagination.pages ===
      Math.ceil(paginated.pagination.records / paginated.pagination.limit),
  );
  // 9. Test date range filtering - created_at_start
  const nowIso = new Date().toISOString();
  const dateFilteredStart =
    await api.functional.ecommerceMall.administrator.categories.snapshots.index(
      adminConnection,
      {
        categoryId,
        body: {
          created_at_start: nowIso,
        } satisfies IEcommerceMallCategoriesSnapshot.IRequest,
      },
    );
  typia.assert(dateFilteredStart);
  TestValidator.equals(
    "date filtered by start count",
    dateFilteredStart.data.length,
    dateFilteredStart.pagination.records,
  );
  // 10. Test date range filtering - created_at_end
  const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
  const dateFilteredEnd =
    await api.functional.ecommerceMall.administrator.categories.snapshots.index(
      adminConnection,
      {
        categoryId,
        body: {
          created_at_end: pastDate,
        } satisfies IEcommerceMallCategoriesSnapshot.IRequest,
      },
    );
  typia.assert(dateFilteredEnd);
  TestValidator.equals(
    "date filtered by end count",
    dateFilteredEnd.data.length,
    dateFilteredEnd.pagination.records,
  );
  // 11. Test combined date range filtering
  const dateRangeFiltered =
    await api.functional.ecommerceMall.administrator.categories.snapshots.index(
      adminConnection,
      {
        categoryId,
        body: {
          created_at_start: pastDate,
          created_at_end: nowIso,
        } satisfies IEcommerceMallCategoriesSnapshot.IRequest,
      },
    );
  typia.assert(dateRangeFiltered);
  TestValidator.equals(
    "date range filtered count",
    dateRangeFiltered.data.length,
    dateRangeFiltered.pagination.records,
  );
  // 12. Test modified_by_id filtering
  const filteredByAdmin =
    await api.functional.ecommerceMall.administrator.categories.snapshots.index(
      adminConnection,
      {
        categoryId,
        body: {
          modified_by_id: admin.id,
        } satisfies IEcommerceMallCategoriesSnapshot.IRequest,
      },
    );
  typia.assert(filteredByAdmin);
  TestValidator.equals(
    "admin filtered snapshots count",
    filteredByAdmin.data.length,
    filteredByAdmin.pagination.records,
  );
  // 13. Test entity_type filtering
  const filteredByEntityType =
    await api.functional.ecommerceMall.administrator.categories.snapshots.index(
      adminConnection,
      {
        categoryId,
        body: {
          entity_type: "category",
        } satisfies IEcommerceMallCategoriesSnapshot.IRequest,
      },
    );
  typia.assert(filteredByEntityType);
  TestValidator.equals(
    "entity type filtered count",
    filteredByEntityType.data.length,
    filteredByEntityType.pagination.records,
  );
  // 14. Test combined sorting and pagination
  const sortedPaginated =
    await api.functional.ecommerceMall.administrator.categories.snapshots.index(
      adminConnection,
      {
        categoryId,
        body: {
          sort_by: "created_at",
          sort_order: "desc",
          page: 2,
          limit: 2,
        } satisfies IEcommerceMallCategoriesSnapshot.IRequest,
      },
    );
  typia.assert(sortedPaginated);
  TestValidator.equals(
    "sorted paginated data length",
    sortedPaginated.data.length,
    2,
  );
  TestValidator.equals(
    "sorted paginated records",
    sortedPaginated.pagination.records,
    sortedByCreatedDesc.pagination.records,
  );
  // 15. Test cursor-based pagination (cursor field exists but empty for first page)
  const cursorPaginated =
    await api.functional.ecommerceMall.administrator.categories.snapshots.index(
      adminConnection,
      {
        categoryId,
        body: {
          cursor: "",
          limit: 5,
        } satisfies IEcommerceMallCategoriesSnapshot.IRequest,
      },
    );
  typia.assert(cursorPaginated);
  TestValidator.equals(
    "cursor paginated data length",
    cursorPaginated.data.length,
    5,
  );
  // 16. Verify all snapshots have required fields
  for (const snapshot of sortedByCreatedDesc.data) {
    typia.assert(snapshot);
    // Verify entity_type is always category
    TestValidator.equals(
      "snapshot entity type",
      snapshot.entity_type,
      "category",
    );
    // Verify entity_id is valid UUID
    TestValidator.predicate(
      "snapshot entity_id is valid",
      /^[0-9a-f-]{36}$/i.test(snapshot.entity_id),
    );
    // Verify created_at is valid date-time
    TestValidator.predicate(
      "snapshot has valid timestamp",
      !isNaN(Date.parse(snapshot.created_at)),
    );
    // Verify modifiedBy exists
    TestValidator.predicate(
      "snapshot has modifiedBy",
      snapshot.modifiedBy !== null && snapshot.modifiedBy !== undefined,
    );
    // Verify category reference exists
    TestValidator.predicate(
      "snapshot has category reference",
      snapshot.category !== null,
    );
    // Verify parentCategory exists (can be null)
    TestValidator.predicate(
      "snapshot has parentCategory",
      snapshot.parentCategory !== null || snapshot.parentCategory === null,
    );
  }
  // 17. Verify pagination metadata consistency across different filter combinations
  TestValidator.equals(
    "pagination records consistent across filters",
    dateFilteredStart.pagination.records,
    dateFilteredEnd.pagination.records,
  );
  TestValidator.equals(
    "pagination records consistent with entity type filter",
    filteredByEntityType.pagination.records,
    dateFilteredStart.pagination.records,
  );
  // 18. Test that default limit is applied when not specified
  const defaultLimit =
    await api.functional.ecommerceMall.administrator.categories.snapshots.index(
      adminConnection,
      {
        categoryId,
        body: {},
      },
    );
  typia.assert(defaultLimit);
  TestValidator.predicate(
    "default limit applied",
    defaultLimit.pagination.limit !== undefined &&
      defaultLimit.pagination.limit >= 1,
  );
  TestValidator.equals(
    "default limit matches records",
    defaultLimit.data.length,
    defaultLimit.pagination.records,
  );
}
