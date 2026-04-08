import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_seller_listing_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminJoinConnection, {
    body: {
      actorType: "customer",
      requestedGrade: "admin",
      reason: "Need admin access to manage sellers and test pagination",
      href: "http://localhost:3000/admin/sellers",
      referrer: "http://localhost:3000/",
    },
  });
  // Create admin connection with authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminAuthorized.email,
      password: "whatever-password-is-set",
      href: "http://localhost:3000/admin/sellers",
      referrer: "http://localhost:3000/",
    },
  });
  // 2. Test default pagination (page 1, limit 20)
  const defaultPage = await api.functional.ecommerceMall.admin.sellers.index(
    adminConnection,
    {
      body: {} satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(defaultPage);
  // Validate default pagination metadata
  TestValidator.equals(
    "default page should be 1",
    defaultPage.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit should be 20",
    defaultPage.pagination.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "records count should be >= 0",
    defaultPage.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count should be >= 0",
    defaultPage.pagination.pagination.pages >= 0,
  );
  // 3. Test page 2 with limit 10
  const page2 = await api.functional.ecommerceMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(page2);
  // Validate page 2 metadata
  TestValidator.equals(
    "page 2 should have current=2",
    page2.pagination.pagination.current,
    2,
  );
  TestValidator.equals(
    "limit 10 should be reflected",
    page2.pagination.pagination.limit,
    10,
  );
  // 4. Test max limit constraint (100 records max)
  const maxLimitPage = await api.functional.ecommerceMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(maxLimitPage);
  TestValidator.equals(
    "max limit 100 should be enforced",
    maxLimitPage.pagination.pagination.limit,
    100,
  );
  // 5. Verify pagination works with filters
  const filteredPage = await api.functional.ecommerceMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        search: "test",
        approvalStatus: "pending",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(filteredPage);
  // Validate filtered results structure
  TestValidator.predicate(
    "filtered results should have pagination",
    filteredPage.pagination.pagination !== undefined,
  );
  TestValidator.predicate(
    "filtered data should be array",
    Array.isArray(filteredPage.pagination.data),
  );
  // 6. Verify sort order is by created_at descending (newest first)
  if (defaultPage.pagination.data.length > 1) {
    const dates = defaultPage.pagination.data
      .filter((seller) => seller.created_at !== undefined)
      .map((seller) => new Date(seller.created_at!).getTime());
    const isDescending = dates.every(
      (date, i) => i === 0 || date <= dates[i - 1],
    );
    TestValidator.predicate(
      "results should be sorted by created_at descending",
      isDescending,
    );
  }
  // 7. Verify seller summary structure
  for (const seller of defaultPage.pagination.data) {
    TestValidator.predicate("seller should have id", seller.id !== undefined);
    TestValidator.predicate(
      "seller should have created_at",
      seller.created_at !== undefined,
    );
  }
  // 8. Test pagination with date range filter
  const dateRangePage = await api.functional.ecommerceMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        createdAtFrom: "2020-01-01T00:00:00.000Z",
        createdAtTo: "2030-12-31T23:59:59.999Z",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(dateRangePage);
  TestValidator.predicate(
    "date range filter should return results",
    dateRangePage.pagination.data !== undefined,
  );
}