import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminActionAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminActionAudit";
import type { IShoppingMallAdminActionAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminActionAudit";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_admin_action_audits_basic_search_by_admin_and_date_range(
  connection: api.IConnection,
) {
  // 1. Join a new platform admin (also sets Authorization header via SDK)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Define createdAt range around now (from yesterday to tomorrow)
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const createdFrom = new Date(now.getTime() - oneDayMs).toISOString();
  const createdTo = new Date(now.getTime() + oneDayMs).toISOString();

  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 20 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const requestBody = {
    page,
    limit,
    adminId: admin.id,
    createdFrom,
    createdTo,
  } satisfies IShoppingMallAdminActionAudit.IRequest;

  // 3. Call analytics adminActionAudits.index with the filter
  const pageResult: IPageIShoppingMallAdminActionAudit.ISummary =
    await api.functional.shoppingMall.platformAdmin.analytics.adminActionAudits.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert<IPageIShoppingMallAdminActionAudit.ISummary>(pageResult);

  const pagination = pageResult.pagination;

  // 4. Basic pagination invariants
  TestValidator.predicate(
    "pagination.current is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    pagination.pages >= 0,
  );

  // If there are records, ensure data has elements and meets filter constraints
  if (pagination.records > 0) {
    TestValidator.predicate(
      "data length is > 0 when records > 0",
      pageResult.data.length > 0,
    );

    // All records should belong to the joined admin and be within date range
    for (const audit of pageResult.data) {
      typia.assert<IShoppingMallAdminActionAudit.ISummary>(audit);

      TestValidator.equals(
        "audit.platformadmin_id equals filter adminId",
        audit.platformadmin_id,
        admin.id,
      );

      const createdAtDate = new Date(audit.created_at).getTime();
      const fromDate = new Date(createdFrom).getTime();
      const toDate = new Date(createdTo).getTime();

      TestValidator.predicate(
        "audit.created_at is within [createdFrom, createdTo]",
        createdAtDate >= fromDate && createdAtDate <= toDate,
      );
    }
  }

  // 5. Optional: perform another query with sortBy/sortDirection set
  const sortedRequestBody = {
    page,
    limit,
    adminId: admin.id,
    createdFrom,
    createdTo,
    sortBy: "createdAt",
    sortDirection: "desc" as const,
  } satisfies IShoppingMallAdminActionAudit.IRequest;

  const sortedPageResult: IPageIShoppingMallAdminActionAudit.ISummary =
    await api.functional.shoppingMall.platformAdmin.analytics.adminActionAudits.index(
      connection,
      {
        body: sortedRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallAdminActionAudit.ISummary>(sortedPageResult);

  const sortedPagination = sortedPageResult.pagination;

  TestValidator.predicate(
    "sorted pagination.current is non-negative",
    sortedPagination.current >= 0,
  );
  TestValidator.predicate(
    "sorted pagination.limit is non-negative",
    sortedPagination.limit >= 0,
  );
  TestValidator.predicate(
    "sorted pagination.records is non-negative",
    sortedPagination.records >= 0,
  );
  TestValidator.predicate(
    "sorted pagination.pages is non-negative",
    sortedPagination.pages >= 0,
  );

  if (sortedPagination.records > 0) {
    TestValidator.predicate(
      "sorted data length is > 0 when records > 0",
      sortedPageResult.data.length > 0,
    );

    for (const audit of sortedPageResult.data) {
      typia.assert<IShoppingMallAdminActionAudit.ISummary>(audit);

      TestValidator.equals(
        "sorted audit.platformadmin_id equals filter adminId",
        audit.platformadmin_id,
        admin.id,
      );

      const createdAtDate = new Date(audit.created_at).getTime();
      const fromDate = new Date(createdFrom).getTime();
      const toDate = new Date(createdTo).getTime();

      TestValidator.predicate(
        "sorted audit.created_at is within [createdFrom, createdTo]",
        createdAtDate >= fromDate && createdAtDate <= toDate,
      );
    }
  }
}
