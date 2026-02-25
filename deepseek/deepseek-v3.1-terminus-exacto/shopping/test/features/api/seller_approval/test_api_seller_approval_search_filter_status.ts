import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommercePlatformEventOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEventOfSeller";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformEventOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformEventOfSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_approval_search_filter_status(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate as administrator using available API
  const adminAuth = await api.functional.ecommerce.auth.administrator.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "admin123" satisfies string & tags.Format<"password">,
      } satisfies IEcommerceAdministrator.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Create new authenticated admin connection
  const authenticatedAdminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${adminAuth.token.access}` },
  };
  // Test search with pending status filter
  const pendingSearch =
    await api.functional.ecommerce.administrator.seller_approvals.index(
      authenticatedAdminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IEcommercePlatformEventOfSeller.IRequest,
      },
    );
  typia.assert(pendingSearch);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination should exist",
    pendingSearch.pagination !== undefined,
  );
  TestValidator.equals(
    "current page should be 1",
    pendingSearch.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit should be positive",
    pendingSearch.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count should be non-negative",
    pendingSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count should be non-negative",
    pendingSearch.pagination.pages >= 0,
  );
  // Test pagination with different parameters
  const paginationTest =
    await api.functional.ecommerce.administrator.seller_approvals.index(
      authenticatedAdminConnection,
      {
        body: {
          status: "pending",
          page: 2,
          limit: 5,
        } satisfies IEcommercePlatformEventOfSeller.IRequest,
      },
    );
  typia.assert(paginationTest);
  // Validate pagination behavior
  TestValidator.equals(
    "page should be 2",
    paginationTest.pagination.current,
    2,
  );
  TestValidator.equals("limit should be 5", paginationTest.pagination.limit, 5);
  // Test searching with all statuses (no filter)
  const allStatusSearch =
    await api.functional.ecommerce.administrator.seller_approvals.index(
      authenticatedAdminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommercePlatformEventOfSeller.IRequest,
      },
    );
  typia.assert(allStatusSearch);
  // Test searching with under_review status
  const underReviewSearch =
    await api.functional.ecommerce.administrator.seller_approvals.index(
      authenticatedAdminConnection,
      {
        body: {
          status: "under_review",
          page: 1,
          limit: 10,
        } satisfies IEcommercePlatformEventOfSeller.IRequest,
      },
    );
  typia.assert(underReviewSearch);
  // Validate structure of returned seller approval summaries
  if (pendingSearch.data.length > 0) {
    const firstApproval = pendingSearch.data[0];
    typia.assert(firstApproval);
    TestValidator.predicate(
      "should have seller field",
      firstApproval.seller !== undefined,
    );
    TestValidator.predicate(
      "seller should have id",
      firstApproval.seller.id !== undefined,
    );
    TestValidator.predicate(
      "seller should have email",
      firstApproval.seller.email !== undefined,
    );
    TestValidator.predicate(
      "seller should have shop name",
      firstApproval.seller.shop_name !== undefined,
    );
    TestValidator.predicate(
      "seller should have account status",
      firstApproval.seller.account_status !== undefined,
    );
    TestValidator.predicate(
      "seller should have creation date",
      firstApproval.seller.created_at !== undefined,
    );
    TestValidator.predicate(
      "status should exist",
      firstApproval.status !== undefined,
    );
    TestValidator.predicate(
      "submission date should exist",
      firstApproval.submission_date !== undefined,
    );
  }
}
