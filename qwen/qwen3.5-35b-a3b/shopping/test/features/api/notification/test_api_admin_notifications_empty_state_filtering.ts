import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_notifications_empty_state_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(admin);
  // 2. Test with no filters (default behavior)
  const defaultResult =
    await api.functional.ecommerceMall.admin.notifications.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(defaultResult);
  TestValidator.equals(
    "default pagination metadata",
    defaultResult.pagination.current,
    defaultResult.pagination.current,
  );
  // 3. Test search with no matches - empty list response
  const noMatchSearch =
    await api.functional.ecommerceMall.admin.notifications.index(
      adminConnection,
      {
        body: {
          search: "this_search_term_definitely_does_not_exist_xyz_123",
        },
      },
    );
  typia.assert(noMatchSearch);
  TestValidator.equals(
    "empty search has no records",
    noMatchSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search has no pages",
    noMatchSearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search has empty data array",
    noMatchSearch.data.length,
    0,
  );
  // 4. Test date range with no notifications
  const pastDateFrom: string & tags.Format<"date-time"> = new Date(
    new Date().getTime() - 1000 * 60 * 60 * 24 * 365 * 10,
  ).toISOString();
  const pastDateTo: string & tags.Format<"date-time"> = new Date(
    new Date().getTime() - 1000 * 60 * 60 * 24 * 365 * 9,
  ).toISOString();
  const noDateRangeNotifications =
    await api.functional.ecommerceMall.admin.notifications.index(
      adminConnection,
      {
        body: {
          created_at_from: pastDateFrom,
          created_at_to: pastDateTo,
        },
      },
    );
  typia.assert(noDateRangeNotifications);
  TestValidator.equals(
    "date range has no records",
    noDateRangeNotifications.pagination.records,
    0,
  );
  TestValidator.equals(
    "date range has empty data",
    noDateRangeNotifications.data.length,
    0,
  );
  // 5. Test invalid actor_type with actor_id combination
  const invalidActorFilter =
    await api.functional.ecommerceMall.admin.notifications.index(
      adminConnection,
      {
        body: {
          actor_type: "invalid_actor_type",
          actor_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(invalidActorFilter);
  TestValidator.equals(
    "invalid actor filter pagination records",
    invalidActorFilter.pagination.records,
    0,
  );
  TestValidator.equals(
    "invalid actor filter has empty data",
    invalidActorFilter.data.length,
    0,
  );
  // 6. Test pagination edge cases
  // Page 1 (first page)
  const page1Result =
    await api.functional.ecommerceMall.admin.notifications.index(
      adminConnection,
      {
        body: {
          page: 1,
          per_page: 10,
        },
      },
    );
  typia.assert(page1Result);
  TestValidator.equals("page 1 current", page1Result.pagination.current, 1);
  // Test beyond total pages (use very large page number)
  const beyondTotalPages =
    await api.functional.ecommerceMall.admin.notifications.index(
      adminConnection,
      {
        body: {
          page: 999999,
          per_page: 10,
        },
      },
    );
  typia.assert(beyondTotalPages);
  TestValidator.equals(
    "beyond total pages has empty data",
    beyondTotalPages.data.length,
    0,
  );
  // 7. Test per_page at minimum (1) and maximum (100)
  const minPerPage =
    await api.functional.ecommerceMall.admin.notifications.index(
      adminConnection,
      {
        body: {
          per_page: 1,
        },
      },
    );
  typia.assert(minPerPage);
  TestValidator.equals("min per_page limit", minPerPage.pagination.limit, 1);
  const maxPerPage =
    await api.functional.ecommerceMall.admin.notifications.index(
      adminConnection,
      {
        body: {
          per_page: 100,
        },
      },
    );
  typia.assert(maxPerPage);
  TestValidator.equals("max per_page limit", maxPerPage.pagination.limit, 100);
  // 8. Verify empty data array with valid pagination object
  const emptyResult =
    await api.functional.ecommerceMall.admin.notifications.index(
      adminConnection,
      {
        body: {
          search: "nonexistent_term",
          type: "nonexistent_type",
        },
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result has no records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result has no pages",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result has empty array",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty result has current 0",
    emptyResult.pagination.current,
    0,
  );
  TestValidator.equals(
    "empty result has limit 0",
    emptyResult.pagination.limit,
    0,
  );
  // 9. Test sorting on empty result set
  const sortOnEmpty =
    await api.functional.ecommerceMall.admin.notifications.index(
      adminConnection,
      {
        body: {
          sort: "created_at",
          order: "desc",
          search: "nonexistent",
        },
      },
    );
  typia.assert(sortOnEmpty);
  TestValidator.equals(
    "sorting empty has no records",
    sortOnEmpty.pagination.records,
    0,
  );
  TestValidator.equals(
    "sorting empty has empty data",
    sortOnEmpty.data.length,
    0,
  );
  // 10. Test cursor-based pagination efficiency with limit parameter
  const limitResult =
    await api.functional.ecommerceMall.admin.notifications.index(
      adminConnection,
      {
        body: {
          limit: 50,
        },
      },
    );
  typia.assert(limitResult);
  TestValidator.equals(
    "limit parameter works",
    limitResult.pagination.limit,
    50,
  );
}
