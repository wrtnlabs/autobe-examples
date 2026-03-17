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

export async function test_api_seller_listing_filter_by_account_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Filter by account_status='active'
  const activeFilter = await api.functional.ecommerceMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        account_status: "active",
        limit: 10,
        page: 1,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(activeFilter);
  TestValidator.predicate(
    "active filter returns correct status",
    activeFilter.data.every((seller) => seller.account_status === "active"),
  );
  // 3. Filter by account_status='suspended'
  const suspendedFilter =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: {
        account_status: "suspended",
        limit: 10,
        page: 1,
      } satisfies IEcommerceMallSeller.IRequest,
    });
  typia.assert(suspendedFilter);
  TestValidator.predicate(
    "suspended filter returns correct status",
    suspendedFilter.data.every(
      (seller) => seller.account_status === "suspended",
    ),
  );
  // 4. Filter by account_status='banned'
  const bannedFilter = await api.functional.ecommerceMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        account_status: "banned",
        limit: 10,
        page: 1,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(bannedFilter);
  TestValidator.predicate(
    "banned filter returns correct status",
    bannedFilter.data.every((seller) => seller.account_status === "banned"),
  );
  // 5. Test pagination with limit
  const paginatedFilter =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: {
        account_status: "active",
        limit: 1,
        page: 1,
      } satisfies IEcommerceMallSeller.IRequest,
    });
  typia.assert(paginatedFilter);
  TestValidator.predicate(
    "pagination limit respected",
    paginatedFilter.data.length <= 1,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedFilter.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit metadata",
    paginatedFilter.pagination.limit,
    1,
  );
  // 6. Test pagination with page 2
  const page2Filter = await api.functional.ecommerceMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        account_status: "active",
        limit: 1,
        page: 2,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(page2Filter);
  TestValidator.equals("pagination page 2", page2Filter.pagination.current, 2);
  // 7. Test search filtering by shop_name
  const searchFilter = await api.functional.ecommerceMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        search: "",
        limit: 10,
        page: 1,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(searchFilter);
  TestValidator.predicate(
    "search filter returns paginated results",
    searchFilter.data.length >= 0 && searchFilter.pagination.records >= 0,
  );
  // 8. Test combined filters (account_status + shop_name)
  const combinedFilter = await api.functional.ecommerceMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        account_status: "active",
        shop_name: "",
        limit: 10,
        page: 1,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(combinedFilter);
  TestValidator.predicate(
    "combined filters return correct status",
    combinedFilter.data.every((seller) => seller.account_status === "active"),
  );
  // 9. Test email filter
  const emailFilter = await api.functional.ecommerceMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        email: undefined,
        limit: 10,
        page: 1,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(emailFilter);
  TestValidator.predicate(
    "email filter returns paginated results",
    emailFilter.pagination.current >= 1 && emailFilter.pagination.limit >= 1,
  );
  // 10. Test approval_status filter combined with account_status
  const approvalFilter = await api.functional.ecommerceMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        approval_status: "approved",
        account_status: "active",
        limit: 10,
        page: 1,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(approvalFilter);
  TestValidator.predicate(
    "approval + account status filter",
    approvalFilter.data.every(
      (seller) =>
        seller.approval_status === "approved" &&
        seller.account_status === "active",
    ),
  );
}