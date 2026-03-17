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

export async function test_api_admin_seller_approval_list_filtered_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Test filtering by approval_status
  const approvalStatuses = ["pending", "approved", "rejected"] as const;
  for (const status of approvalStatuses) {
    const result =
      await api.functional.ecommerceMall.admin.sellers.approvals.index(
        adminConnection,
        {
          body: {
            approval_status: status,
            page: 1,
            limit: 20,
          } satisfies IEcommerceMallSeller.IRequest,
        },
      );
    typia.assert(result);
    TestValidator.equals(
      `approval_status filter (${status}) pagination`,
      result.pagination.current,
      1,
    );
    TestValidator.predicate(
      `approval_status filter (${status}) has valid limit`,
      result.pagination.limit > 0,
    );
  }
  // 3. Test filtering by account_status
  const accountStatuses = ["active", "suspended", "banned"] as const;
  for (const status of accountStatuses) {
    const result =
      await api.functional.ecommerceMall.admin.sellers.approvals.index(
        adminConnection,
        {
          body: {
            account_status: status,
            page: 1,
            limit: 20,
          } satisfies IEcommerceMallSeller.IRequest,
        },
      );
    typia.assert(result);
    TestValidator.equals(
      `account_status filter (${status}) pagination`,
      result.pagination.current,
      1,
    );
    TestValidator.predicate(
      `account_status filter (${status}) has valid limit`,
      result.pagination.limit > 0,
    );
  }
  // 4. Test combined filtering (approval_status + account_status)
  const combinedResult =
    await api.functional.ecommerceMall.admin.sellers.approvals.index(
      adminConnection,
      {
        body: {
          approval_status: "rejected",
          account_status: "active",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallSeller.IRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.equals(
    "combined filter pagination",
    combinedResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "combined filter has valid limit",
    combinedResult.pagination.limit > 0,
  );
  // 5. Test filtering by email partial match
  const emailFilterResult =
    await api.functional.ecommerceMall.admin.sellers.approvals.index(
      adminConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallSeller.IRequest,
      },
    );
  typia.assert(emailFilterResult);
  TestValidator.equals(
    "email filter pagination",
    emailFilterResult.pagination.current,
    1,
  );
  // 6. Test filtering by shop_name partial match
  const shopNameFilterResult =
    await api.functional.ecommerceMall.admin.sellers.approvals.index(
      adminConnection,
      {
        body: {
          shop_name: RandomGenerator.name(),
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallSeller.IRequest,
      },
    );
  typia.assert(shopNameFilterResult);
  TestValidator.equals(
    "shop_name filter pagination",
    shopNameFilterResult.pagination.current,
    1,
  );
  // 7. Test pagination with filters
  const paginatedResult =
    await api.functional.ecommerceMall.admin.sellers.approvals.index(
      adminConnection,
      {
        body: {
          approval_status: "approved",
          page: 2,
          limit: 10,
        } satisfies IEcommerceMallSeller.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination page 2",
    paginatedResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit 10",
    paginatedResult.pagination.limit,
    10,
  );
  // 8. Validate response structure
  const structureResult =
    await api.functional.ecommerceMall.admin.sellers.approvals.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallSeller.IRequest,
      },
    );
  typia.assert(structureResult);
  TestValidator.equals(
    "response has pagination",
    structureResult.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "response has data array",
    Array.isArray(structureResult.data),
    true,
  );
  TestValidator.predicate(
    "pagination has current",
    structureResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    structureResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records",
    structureResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    structureResult.pagination.pages >= 0,
  );
}
