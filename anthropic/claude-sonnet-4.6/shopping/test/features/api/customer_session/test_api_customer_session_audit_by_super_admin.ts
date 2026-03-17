import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_customer_session_audit_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Register a new customer (creates first session record)
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(
    customerConnection,
    {},
  );
  typia.assert(customerAuthorized);
  const customerId = customerAuthorized.id;
  // 3. Primary test: fetch sessions with default pagination (no filters)
  const sessionPage =
    await api.functional.shoppingMall.superAdmin.customers.sessions.index(
      superAdminConnection,
      {
        customerId,
        body: {} satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(sessionPage);
  // Assert pagination.current equals 1
  TestValidator.equals(
    "pagination current page is 1",
    sessionPage.pagination.current,
    1,
  );
  // Assert pagination.records >= 1
  TestValidator.predicate(
    "pagination records >= 1",
    sessionPage.pagination.records >= 1,
  );
  // Assert data array is non-empty
  TestValidator.predicate(
    "session data is non-empty",
    sessionPage.data.length >= 1,
  );
  // Assert each session does NOT contain raw JWT tokens (security validation)
  for (const session of sessionPage.data) {
    TestValidator.predicate(
      "session summary has no access_token field",
      !("access_token" in session),
    );
    TestValidator.predicate(
      "session summary has no refresh_token field",
      !("refresh_token" in session),
    );
  }
  // Assert sessions are ordered by created_at DESC (most recent first)
  for (let i = 0; i < sessionPage.data.length - 1; i++) {
    const current = sessionPage.data[i]!;
    const next = sessionPage.data[i + 1]!;
    TestValidator.predicate(
      "sessions ordered by created_at DESC",
      current.created_at >= next.created_at,
    );
  }
  // 4. Pagination validation: call with limit=1, page=1
  const paginatedPage =
    await api.functional.shoppingMall.superAdmin.customers.sessions.index(
      superAdminConnection,
      {
        customerId,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(paginatedPage);
  // Assert only one session returned per page
  TestValidator.equals(
    "paginated result has 1 session",
    paginatedPage.data.length,
    1,
  );
  // Assert pagination.records >= 1
  TestValidator.predicate(
    "paginated records >= 1",
    paginatedPage.pagination.records >= 1,
  );
  // 5. Edge case: customer with a single session (created during join)
  // pagination.records should be exactly 1
  TestValidator.equals(
    "records is exactly 1",
    sessionPage.pagination.records,
    1,
  );
  // pagination.pages should be 1 when limit >= total record count
  const bigLimitPage =
    await api.functional.shoppingMall.superAdmin.customers.sessions.index(
      superAdminConnection,
      {
        customerId,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 100 as number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(bigLimitPage);
  TestValidator.equals(
    "pages equals 1 with large limit",
    bigLimitPage.pagination.pages,
    1,
  );
  // Assert the single session's is_active field is true
  const singleSession = bigLimitPage.data[0]!;
  TestValidator.predicate(
    "single join session is active",
    singleSession.is_active === true,
  );
}
