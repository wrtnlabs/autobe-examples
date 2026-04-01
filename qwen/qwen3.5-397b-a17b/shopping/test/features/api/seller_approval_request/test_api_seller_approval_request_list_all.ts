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

export async function test_api_seller_approval_request_list_all(
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
  // 2. Create three seller accounts - each automatically generates a pending approval request
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
  // 3. Administrator calls PATCH /shoppingMall/seller/approval-requests with empty filter body
  const response =
    await api.functional.shoppingMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {} satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(response);
  // 4. Verify pagination metadata
  TestValidator.predicate(
    "pagination current page >= 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit >= 1",
    response.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records >= 3",
    response.pagination.records >= 3,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    response.pagination.pages ===
      Math.ceil(response.pagination.records / response.pagination.limit),
  );
  // 5. Verify all three seller approval requests are returned
  TestValidator.predicate(
    "at least 3 approval requests returned",
    response.data.length >= 3,
  );
  // 6. Verify each approval request business logic
  for (const request of response.data) {
    // Verify status is pending for newly created sellers
    TestValidator.equals("status is pending", request.status, "pending");
    // Verify reviewed_at is null for pending requests
    TestValidator.equals(
      "reviewed_at is null for pending",
      request.reviewed_at,
      null,
    );
    // Verify seller information is present and has correct approval status
    TestValidator.predicate(
      "seller exists",
      request.seller !== null && request.seller !== undefined,
    );
    TestValidator.predicate(
      "seller approval_status is pending",
      request.seller.approval_status === "pending",
    );
    // Verify reviewingAdministrator is null for pending requests
    TestValidator.equals(
      "reviewingAdministrator is null for pending",
      request.reviewingAdministrator,
      null,
    );
  }
  // 7. Verify results are sorted by submitted_at descending (newest first)
  for (let i = 1; i < response.data.length; i++) {
    const prevDate = new Date(response.data[i - 1].submitted_at).getTime();
    const currDate = new Date(response.data[i].submitted_at).getTime();
    TestValidator.predicate(
      `sorted by submitted_at desc: item ${i - 1} >= item ${i}`,
      prevDate >= currDate,
    );
  }
  // 8. Verify the created sellers are in the results
  const sellerIds = response.data.map((req) => req.seller.id);
  TestValidator.predicate(
    "seller1 is in results",
    sellerIds.includes(seller1Auth.id),
  );
  TestValidator.predicate(
    "seller2 is in results",
    sellerIds.includes(seller2Auth.id),
  );
  TestValidator.predicate(
    "seller3 is in results",
    sellerIds.includes(seller3Auth.id),
  );
}
