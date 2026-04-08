import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_pending_seller_approvals_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Use the admin connection for API calls
  // The authorize_administrator_join function updates adminConnection.headers internally
  // 3. Test filtering and search functionality
  // Test 1: Search by email (partial match)
  const searchEmail = "test@example.com";
  const searchResult =
    await api.functional.ecommerceMall.administrator.sellers.pending.index(
      adminConnection,
      {
        body: {
          search: searchEmail,
        } satisfies IEcommerceMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(searchResult);
  // Test 2: Date range filtering
  const baseDate = new Date();
  const fiveDaysAgo = new Date(baseDate.getTime() - 5 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(baseDate.getTime() - 3 * 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.ecommerceMall.administrator.sellers.pending.index(
      adminConnection,
      {
        body: {
          created_at_gte: fiveDaysAgo.toISOString(),
          created_at_lte: threeDaysAgo.toISOString(),
        } satisfies IEcommerceMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // Test 3: Sorting by created_at descending
  const sortDescResult =
    await api.functional.ecommerceMall.administrator.sellers.pending.index(
      adminConnection,
      {
        body: {
          sort_by: "created_at",
          order: "desc",
          limit: 3,
        } satisfies IEcommerceMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(sortDescResult);
  // Test 4: Sorting by created_at ascending
  const sortAscResult =
    await api.functional.ecommerceMall.administrator.sellers.pending.index(
      adminConnection,
      {
        body: {
          sort_by: "created_at",
          order: "asc",
          limit: 3,
        } satisfies IEcommerceMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(sortAscResult);
  // Test 5: Pagination - page 1
  const page1Result =
    await api.functional.ecommerceMall.administrator.sellers.pending.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IEcommerceMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(page1Result);
  // Test 6: Pagination - page 2
  const page2Result =
    await api.functional.ecommerceMall.administrator.sellers.pending.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 2,
        } satisfies IEcommerceMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(page2Result);
  // 4. Validate pagination structure
  TestValidator.equals(
    "page 1 pagination current",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 pagination limit",
    page1Result.pagination.limit,
    2,
  );
  TestValidator.equals(
    "page 2 pagination current",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 pagination limit",
    page2Result.pagination.limit,
    2,
  );
  // 5. Validate data array types
  TestValidator.predicate(
    "page 1 data is array",
    Array.isArray(page1Result.data),
  );
  TestValidator.predicate(
    "page 2 data is array",
    Array.isArray(page2Result.data),
  );
  // 6. Test with status filter for pending only
  const pendingStatusResult =
    await api.functional.ecommerceMall.administrator.sellers.pending.index(
      adminConnection,
      {
        body: {
          status: ["pending"],
        } satisfies IEcommerceMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(pendingStatusResult);
}
