import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_archived_seller_search_by_admin_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Test search without any filters (empty filter returns all archived sellers)
  const allResults: IPageIEcommerceMallSeller.ISummary =
    await api.functional.ecommerceMall.admin.archived_sellers.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallSeller.IArchiveRequest,
      },
    );
  typia.assert(allResults);
  // 3. Test search with email partial match filter
  const emailFilter = RandomGenerator.alphabets(5);
  const emailResults: IPageIEcommerceMallSeller.ISummary =
    await api.functional.ecommerceMall.admin.archived_sellers.index(
      adminConnection,
      {
        body: {
          email: emailFilter,
        } satisfies IEcommerceMallSeller.IArchiveRequest,
      },
    );
  typia.assert(emailResults);
  // 4. Test search with deletion date range filter
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeResults: IPageIEcommerceMallSeller.ISummary =
    await api.functional.ecommerceMall.admin.archived_sellers.index(
      adminConnection,
      {
        body: {
          deletedAtFrom: thirtyDaysAgo.toISOString(),
          deletedAtTo: now.toISOString(),
        } satisfies IEcommerceMallSeller.IArchiveRequest,
      },
    );
  typia.assert(dateRangeResults);
  // 5. Test search with creation date range filter
  const creationRangeResults: IPageIEcommerceMallSeller.ISummary =
    await api.functional.ecommerceMall.admin.archived_sellers.index(
      adminConnection,
      {
        body: {
          createdAtFrom: thirtyDaysAgo.toISOString(),
          createdAtTo: now.toISOString(),
        } satisfies IEcommerceMallSeller.IArchiveRequest,
      },
    );
  typia.assert(creationRangeResults);
  // 6. Test search with approval status filter
  const approvalStatuses = [
    "pending",
    "approved",
    "rejected",
    "suspended",
  ] as const;
  const approvalStatus = RandomGenerator.pick(approvalStatuses);
  const approvalStatusResults: IPageIEcommerceMallSeller.ISummary =
    await api.functional.ecommerceMall.admin.archived_sellers.index(
      adminConnection,
      {
        body: {
          approvalStatus: approvalStatus,
        } satisfies IEcommerceMallSeller.IArchiveRequest,
      },
    );
  typia.assert(approvalStatusResults);
  // 7. Test pagination with specific page and limit
  const pageSize = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
  >();
  const paginatedResults: IPageIEcommerceMallSeller.ISummary =
    await api.functional.ecommerceMall.admin.archived_sellers.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: pageSize,
        } satisfies IEcommerceMallSeller.IArchiveRequest,
      },
    );
  typia.assert(paginatedResults);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination limit matches request",
    paginatedResults.pagination.limit,
    pageSize,
  );
  TestValidator.equals(
    "pagination current page is 1",
    paginatedResults.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    paginatedResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    paginatedResults.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data array length does not exceed limit",
    paginatedResults.data.length <= paginatedResults.pagination.limit,
  );
  // 8. Test combined filters (email + approval status + pagination)
  const combinedResults: IPageIEcommerceMallSeller.ISummary =
    await api.functional.ecommerceMall.admin.archived_sellers.index(
      adminConnection,
      {
        body: {
          email: emailFilter,
          approvalStatus: "approved",
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallSeller.IArchiveRequest,
      },
    );
  typia.assert(combinedResults);
  // Validate combined filter results
  TestValidator.equals(
    "combined results pagination limit is 5",
    combinedResults.pagination.limit,
    5,
  );
  TestValidator.equals(
    "combined results page is 1",
    combinedResults.pagination.current,
    1,
  );
  // 9. Test page 2 if there are enough records
  if (allResults.pagination.records > pageSize) {
    const page2Results: IPageIEcommerceMallSeller.ISummary =
      await api.functional.ecommerceMall.admin.archived_sellers.index(
        adminConnection,
        {
          body: {
            page: 2,
            limit: pageSize,
          } satisfies IEcommerceMallSeller.IArchiveRequest,
        },
      );
    typia.assert(page2Results);
    TestValidator.equals(
      "page 2 current page is 2",
      page2Results.pagination.current,
      2,
    );
  }
}
