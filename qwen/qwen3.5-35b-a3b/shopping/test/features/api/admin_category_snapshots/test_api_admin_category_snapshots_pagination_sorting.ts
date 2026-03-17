import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategorySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategorySnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_category_snapshots_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication via utility function
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // 2. Use adminJoinConnection for API calls (auth function updates headers internally)
  // The connection's headers are updated by authorize_admin_join
  const adminConnection: api.IConnection = adminJoinConnection;
  // 3. Category ID (simulating existing category since we can't create them)
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Test default pagination (page=2, limit=10)
  const defaultPage = 2;
  const defaultLimit = 10;
  const defaultResponse =
    await api.functional.ecommerceMall.admin.categories.snapshots.index(
      adminConnection,
      {
        categoryId,
        body: {
          page: defaultPage,
          limit: defaultLimit,
        } satisfies IEcommerceMallCategorySnapshot.IRequest,
      },
    );
  typia.assert(defaultResponse);
  // 5. Validate pagination metadata for default request
  TestValidator.equals(
    "default pagination current page",
    defaultResponse.pagination.current,
    defaultPage,
  );
  TestValidator.equals(
    "default pagination limit",
    defaultResponse.pagination.limit,
    defaultLimit,
  );
  // 6. Validate data count matches limit
  TestValidator.equals(
    "default pagination data count",
    defaultResponse.data.length,
    defaultLimit,
  );
  // 7. Test sorting by created_at (default DESC)
  const createdAtSortResponse =
    await api.functional.ecommerceMall.admin.categories.snapshots.index(
      adminConnection,
      {
        categoryId,
        body: {
          page: 1,
          limit: 5,
          sort: "created_at",
        } satisfies IEcommerceMallCategorySnapshot.IRequest,
      },
    );
  typia.assert(createdAtSortResponse);
  // 8. Test sorting by name
  const nameSortResponse =
    await api.functional.ecommerceMall.admin.categories.snapshots.index(
      adminConnection,
      {
        categoryId,
        body: {
          page: 1,
          limit: 5,
          sort: "name",
        } satisfies IEcommerceMallCategorySnapshot.IRequest,
      },
    );
  typia.assert(nameSortResponse);
  // 9. Verify sorting produces different order
  TestValidator.notEquals(
    "created_at and name sort produce different order",
    createdAtSortResponse.data.map((s) => s.id).join("\\u0000"),
    nameSortResponse.data.map((s) => s.id).join("\\u0000"),
  );
  // 10. Test boundary: page beyond total
  const largePage = 999;
  const boundaryResponse =
    await api.functional.ecommerceMall.admin.categories.snapshots.index(
      adminConnection,
      {
        categoryId,
        body: {
          page: largePage,
          limit: 10,
        } satisfies IEcommerceMallCategorySnapshot.IRequest,
      },
    );
  typia.assert(boundaryResponse);
  // 11. Validate boundary behavior
  // If page beyond total, should return empty data array
  TestValidator.equals(
    "boundary pagination should return empty data",
    boundaryResponse.data.length,
    0,
  );
  TestValidator.equals(
    "boundary pagination records should be 0",
    boundaryResponse.pagination.records,
    0,
  );
  // 12. Test category and slug sort options
  const categorySortResponse =
    await api.functional.ecommerceMall.admin.categories.snapshots.index(
      adminConnection,
      {
        categoryId,
        body: {
          page: 1,
          limit: 5,
          sort: "category",
        } satisfies IEcommerceMallCategorySnapshot.IRequest,
      },
    );
  typia.assert(categorySortResponse);
  const slugSortResponse =
    await api.functional.ecommerceMall.admin.categories.snapshots.index(
      adminConnection,
      {
        categoryId,
        body: {
          page: 1,
          limit: 5,
          sort: "slug",
        } satisfies IEcommerceMallCategorySnapshot.IRequest,
      },
    );
  typia.assert(slugSortResponse);
  // 13. Verify all sort fields work
  TestValidator.equals(
    "category sort pagination records",
    categorySortResponse.pagination.records,
    createdAtSortResponse.pagination.records,
  );
  TestValidator.equals(
    "slug sort pagination records",
    slugSortResponse.pagination.records,
    createdAtSortResponse.pagination.records,
  );
}
