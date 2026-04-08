import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategorySnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategorySnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

/**
 * Test retrieving category modification snapshots with various filters.
 *
 * Validates the complete category snapshot retrieval flow including filtering by change type, date range, and pagination. Ensures that category modification history is correctly captured and retrievable with proper filtering capabilities.
 *
 * Special attention is given to verifying that snapshots are immutable, properly sorted by created_at descending, and that filtering mechanisms work correctly for administrative oversight and audit trail purposes.
 *
 * 1. Authenticate as administrator
 * 2. Create a parent category
 * 3. Create a subcategory under it (may create snapshots for parent category)
 * 4. Retrieve all snapshots without filters and verify structure
 * 5. Filter by change_type='name' and verify filtering works
 * 6. Filter by change_type='description' and verify filtering works
 * 7. Filter by change_type='parent_category' and verify filtering works
 * 8. Filter by date range and verify only snapshots within range returned
 * 9. Test pagination with limit and verify cursor-based navigation
 */
export async function test_api_category_snapshots_retrieval_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin",
    },
  });
  // 2. Create a parent category
  const parentCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic devices and accessories",
        },
      },
    );
  typia.assert(parentCategory);
  // 3. Create a subcategory under it (may create snapshots for parent category)
  const subcategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Smartphones",
          description: "Mobile phones and accessories",
          parent_category_id: parentCategory.id,
        },
      },
    );
  typia.assert(subcategory);
  // 4. Retrieve all snapshots without filters
  const allSnapshots =
    await api.functional.shoppingMall.categories.snapshots.index(
      adminConnection,
      {
        categoryId: parentCategory.id,
        body: {},
      },
    );
  typia.assert(allSnapshots);
  TestValidator.equals(
    "pagination current page",
    allSnapshots.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    allSnapshots.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count matches data length",
    allSnapshots.pagination.records === allSnapshots.data.length,
  );
  // Verify snapshots are sorted by created_at descending (if multiple exist)
  if (allSnapshots.data.length > 1) {
    for (let i = 1; i < allSnapshots.data.length; i++) {
      TestValidator.predicate(
        `snapshot ${i} created_at >= snapshot ${i + 1} created_at`,
        new Date(allSnapshots.data[i - 1].created_at) >=
          new Date(allSnapshots.data[i].created_at),
      );
    }
  }
  // 5. Filter by change_type='name'
  const nameSnapshots =
    await api.functional.shoppingMall.categories.snapshots.index(
      adminConnection,
      {
        categoryId: parentCategory.id,
        body: {
          change_type: "name",
        },
      },
    );
  typia.assert(nameSnapshots);
  // Verify all returned snapshots have name changes
  for (const snapshot of nameSnapshots.data) {
    TestValidator.notEquals(
      "name changed in snapshot",
      snapshot.name_before,
      snapshot.name_after,
    );
  }
  // 6. Filter by change_type='description'
  const descriptionSnapshots =
    await api.functional.shoppingMall.categories.snapshots.index(
      adminConnection,
      {
        categoryId: parentCategory.id,
        body: {
          change_type: "description",
        },
      },
    );
  typia.assert(descriptionSnapshots);
  // Verify all returned snapshots have description changes
  for (const snapshot of descriptionSnapshots.data) {
    TestValidator.notEquals(
      "description changed in snapshot",
      snapshot.description_before,
      snapshot.description_after,
    );
  }
  // 7. Filter by change_type='parent_category'
  const parentCategorySnapshots =
    await api.functional.shoppingMall.categories.snapshots.index(
      adminConnection,
      {
        categoryId: parentCategory.id,
        body: {
          change_type: "parent_category",
        },
      },
    );
  typia.assert(parentCategorySnapshots);
  // Verify all returned snapshots have parent_category changes
  for (const snapshot of parentCategorySnapshots.data) {
    TestValidator.notEquals(
      "parent_category_id changed in snapshot",
      snapshot.parent_category_id_before,
      snapshot.parent_category_id_after,
    );
  }
  // 8. Filter by date range
  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const dateRangeSnapshots =
    await api.functional.shoppingMall.categories.snapshots.index(
      adminConnection,
      {
        categoryId: parentCategory.id,
        body: {
          created_at_from: oneYearAgo.toISOString(),
          created_at_to: now.toISOString(),
        },
      },
    );
  typia.assert(dateRangeSnapshots);
  // Verify all returned snapshots are within the date range
  for (const snapshot of dateRangeSnapshots.data) {
    const snapshotDate = new Date(snapshot.created_at);
    TestValidator.predicate(
      "snapshot within date range",
      snapshotDate >= oneYearAgo && snapshotDate <= now,
    );
  }
  // 9. Test pagination with limit
  const paginatedSnapshots =
    await api.functional.shoppingMall.categories.snapshots.index(
      adminConnection,
      {
        categoryId: parentCategory.id,
        body: {
          limit: 2,
        },
      },
    );
  typia.assert(paginatedSnapshots);
  TestValidator.equals(
    "pagination limit applied",
    paginatedSnapshots.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    paginatedSnapshots.data.length <= 2,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    paginatedSnapshots.pagination.pages ===
      Math.ceil(
        paginatedSnapshots.pagination.records /
          paginatedSnapshots.pagination.limit,
      ),
  );
  // 10. Test pagination with page parameter
  const pageSnapshots =
    await api.functional.shoppingMall.categories.snapshots.index(
      adminConnection,
      {
        categoryId: parentCategory.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(pageSnapshots);
  TestValidator.equals(
    "pagination current page is 1",
    pageSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    pageSnapshots.pagination.limit,
    10,
  );
}
