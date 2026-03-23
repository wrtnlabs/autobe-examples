import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test pagination and sorting functionality for administrator cancellation snapshot listing.
 *
 * This test validates:
 * 1. Default pagination returns 20 records per page
 * 2. Page parameter is 1-indexed
 * 3. Limit parameter accepts values from 1 to 100
 * 4. Sorting by 'id', 'cancellationRequestId', and 'createdAt' fields
 * 5. Pagination metadata accuracy
 * 6. Edge cases (empty results, beyond total pages)
 */
export async function test_api_cancellation_snapshot_admin_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Test default pagination (limit=20, page=1)
  const defaultResult =
    await api.functional.shoppingMall.admin.cancellationSnapshots.index(
      adminConnection,
      {
        body: {} satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(defaultResult);
  TestValidator.equals(
    "default limit is 20",
    defaultResult.pagination.limit,
    20,
  );
  TestValidator.equals(
    "default page is 1",
    defaultResult.pagination.current,
    1,
  );
  // 3. Test custom limit values
  const smallLimitResult =
    await api.functional.shoppingMall.admin.cancellationSnapshots.index(
      adminConnection,
      {
        body: {
          limit: 5,
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(smallLimitResult);
  TestValidator.equals(
    "custom limit applied",
    smallLimitResult.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data count matches limit or records",
    smallLimitResult.data.length <= smallLimitResult.pagination.limit,
  );
  // 4. Test maximum limit (100)
  const maxLimitResult =
    await api.functional.shoppingMall.admin.cancellationSnapshots.index(
      adminConnection,
      {
        body: {
          limit: 100,
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(maxLimitResult);
  TestValidator.equals(
    "max limit applied",
    maxLimitResult.pagination.limit,
    100,
  );
  // 5. Test page navigation
  const page1Result =
    await api.functional.shoppingMall.admin.cancellationSnapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(page1Result);
  TestValidator.equals("page 1 current", page1Result.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 10);
  // Test page 2
  const page2Result =
    await api.functional.shoppingMall.admin.cancellationSnapshots.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  // 6. Test sorting by 'id' ascending
  const sortByIdAsc =
    await api.functional.shoppingMall.admin.cancellationSnapshots.index(
      adminConnection,
      {
        body: {
          sortBy: "id",
          sortOrder: "asc",
          limit: 50,
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(sortByIdAsc);
  // Validate ascending order by comparing consecutive IDs
  for (let i = 1; i < sortByIdAsc.data.length; i++) {
    TestValidator.predicate(
      `id ascending order at index ${i}`,
      sortByIdAsc.data[i - 1].id.localeCompare(sortByIdAsc.data[i].id) <= 0,
    );
  }
  // 7. Test sorting by 'id' descending
  const sortByIdDesc =
    await api.functional.shoppingMall.admin.cancellationSnapshots.index(
      adminConnection,
      {
        body: {
          sortBy: "id",
          sortOrder: "desc",
          limit: 50,
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(sortByIdDesc);
  // Validate descending order
  for (let i = 1; i < sortByIdDesc.data.length; i++) {
    TestValidator.predicate(
      `id descending order at index ${i}`,
      sortByIdDesc.data[i - 1].id.localeCompare(sortByIdDesc.data[i].id) >= 0,
    );
  }
  // 8. Test sorting by 'cancellationRequestId' ascending
  const sortByCancellationRequestIdAsc =
    await api.functional.shoppingMall.admin.cancellationSnapshots.index(
      adminConnection,
      {
        body: {
          sortBy: "cancellationRequestId",
          sortOrder: "asc",
          limit: 50,
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(sortByCancellationRequestIdAsc);
  // Validate ascending order
  for (let i = 1; i < sortByCancellationRequestIdAsc.data.length; i++) {
    TestValidator.predicate(
      `cancellationRequestId ascending order at index ${i}`,
      sortByCancellationRequestIdAsc.data[
        i - 1
      ].cancellationRequestId.localeCompare(
        sortByCancellationRequestIdAsc.data[i].cancellationRequestId,
      ) <= 0,
    );
  }
  // 9. Test sorting by 'createdAt' ascending (chronological order)
  const sortByCreatedAtAsc =
    await api.functional.shoppingMall.admin.cancellationSnapshots.index(
      adminConnection,
      {
        body: {
          sortBy: "createdAt",
          sortOrder: "asc",
          limit: 50,
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(sortByCreatedAtAsc);
  // Validate chronological order
  for (let i = 1; i < sortByCreatedAtAsc.data.length; i++) {
    TestValidator.predicate(
      `createdAt ascending order at index ${i}`,
      new Date(sortByCreatedAtAsc.data[i - 1].createdAt).getTime() <=
        new Date(sortByCreatedAtAsc.data[i].createdAt).getTime(),
    );
  }
  // 10. Test sorting by 'createdAt' descending (reverse chronological)
  const sortByCreatedAtDesc =
    await api.functional.shoppingMall.admin.cancellationSnapshots.index(
      adminConnection,
      {
        body: {
          sortBy: "createdAt",
          sortOrder: "desc",
          limit: 50,
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(sortByCreatedAtDesc);
  // Validate reverse chronological order
  for (let i = 1; i < sortByCreatedAtDesc.data.length; i++) {
    TestValidator.predicate(
      `createdAt descending order at index ${i}`,
      new Date(sortByCreatedAtDesc.data[i - 1].createdAt).getTime() >=
        new Date(sortByCreatedAtDesc.data[i].createdAt).getTime(),
    );
  }
  // 11. Test pagination metadata accuracy
  const metadataTestResult =
    await api.functional.shoppingMall.admin.cancellationSnapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(metadataTestResult);
  // Validate pages calculation
  const expectedPages = Math.ceil(
    metadataTestResult.pagination.records / metadataTestResult.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation correct",
    metadataTestResult.pagination.pages,
    expectedPages,
  );
  // 12. Test last page may have fewer records
  if (metadataTestResult.pagination.pages > 1) {
    const lastPageResult =
      await api.functional.shoppingMall.admin.cancellationSnapshots.index(
        adminConnection,
        {
          body: {
            page: metadataTestResult.pagination.pages,
            limit: 20,
          } satisfies IShoppingMallCancellationSnapshot.IRequest,
        },
      );
    typia.assert(lastPageResult);
    TestValidator.equals(
      "last page current",
      lastPageResult.pagination.current,
      metadataTestResult.pagination.pages,
    );
    // Last page data count should be <= limit
    TestValidator.predicate(
      "last page data count within limit",
      lastPageResult.data.length <= lastPageResult.pagination.limit,
    );
  }
  // 13. Test requesting beyond total pages returns empty data
  const beyondPagesResult =
    await api.functional.shoppingMall.admin.cancellationSnapshots.index(
      adminConnection,
      {
        body: {
          page: metadataTestResult.pagination.pages + 10,
          limit: 20,
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(beyondPagesResult);
  TestValidator.equals(
    "beyond pages returns empty data",
    beyondPagesResult.data.length,
    0,
  );
  TestValidator.equals(
    "beyond pages current page",
    beyondPagesResult.pagination.current,
    metadataTestResult.pagination.pages + 10,
  );
  TestValidator.equals(
    "beyond pages limit maintained",
    beyondPagesResult.pagination.limit,
    20,
  );
  TestValidator.equals(
    "beyond pages records consistent",
    beyondPagesResult.pagination.records,
    metadataTestResult.pagination.records,
  );
  // 14. Test combined pagination and sorting
  const combinedResult =
    await api.functional.shoppingMall.admin.cancellationSnapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 15,
          sortBy: "createdAt",
          sortOrder: "desc",
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.equals(
    "combined pagination limit",
    combinedResult.pagination.limit,
    15,
  );
  TestValidator.equals(
    "combined pagination page",
    combinedResult.pagination.current,
    1,
  );
  // Validate sorting still works with pagination
  for (let i = 1; i < combinedResult.data.length; i++) {
    TestValidator.predicate(
      `combined createdAt descending at index ${i}`,
      new Date(combinedResult.data[i - 1].createdAt).getTime() >=
        new Date(combinedResult.data[i].createdAt).getTime(),
    );
  }
}
