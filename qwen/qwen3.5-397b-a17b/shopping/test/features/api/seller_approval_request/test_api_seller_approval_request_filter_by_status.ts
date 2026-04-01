import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerApprovalRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_approval_request_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create multiple seller accounts (each creates a pending approval request)
  const seller1Auth = await authorize_seller_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(seller1Auth);
  const seller2Auth = await authorize_seller_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(seller2Auth);
  const seller3Auth = await authorize_seller_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(seller3Auth);
  // 3. Test filtering by pending status
  const pendingRequests =
    await api.functional.shoppingMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          sort: "submitted_at",
          direction: "desc",
          limit: 10,
          page: 1,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(pendingRequests);
  // Validate pagination structure
  TestValidator.predicate(
    "has pagination",
    pendingRequests.pagination !== undefined,
  );
  TestValidator.predicate(
    "has data array",
    Array.isArray(pendingRequests.data),
  );
  TestValidator.predicate(
    "has at least 3 pending requests",
    pendingRequests.data.length >= 3,
  );
  // Validate all returned requests are pending
  for (const request of pendingRequests.data) {
    TestValidator.equals(
      "request status is pending",
      request.status,
      "pending",
    );
    TestValidator.predicate(
      "has submitted_at timestamp",
      request.submitted_at !== undefined,
    );
    TestValidator.predicate(
      "reviewed_at is null for pending",
      request.reviewed_at === null,
    );
    TestValidator.predicate(
      "reviewingAdministrator is null for pending",
      request.reviewingAdministrator === null,
    );
    // Validate seller information
    TestValidator.predicate("has seller id", request.seller.id !== undefined);
    TestValidator.predicate(
      "has seller email",
      request.seller.email !== undefined,
    );
    TestValidator.predicate(
      "seller approval_status is pending",
      request.seller.approval_status === "pending",
    );
  }
  // 4. Test filtering with no status (should return all)
  const allRequests =
    await api.functional.shoppingMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {
          sort: "submitted_at",
          direction: "desc",
          limit: 10,
          page: 1,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(allRequests);
  TestValidator.predicate(
    "all requests count >= pending count",
    allRequests.data.length >= pendingRequests.data.length,
  );
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "current page is 1",
    pendingRequests.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is positive",
    pendingRequests.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    pendingRequests.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    pendingRequests.pagination.pages >= 0,
  );
  // 6. Test with different limit values
  const limitedRequests =
    await api.functional.shoppingMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          limit: 2,
          page: 1,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(limitedRequests);
  TestValidator.predicate(
    "limited to 2 or fewer",
    limitedRequests.data.length <= 2,
  );
  TestValidator.equals(
    "limit in pagination",
    limitedRequests.pagination.limit,
    2,
  );
}
