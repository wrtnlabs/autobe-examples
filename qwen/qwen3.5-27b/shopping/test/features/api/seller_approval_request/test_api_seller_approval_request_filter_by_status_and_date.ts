import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerApprovalRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_seller_approval_requests_create";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";

/**
 * Test filtering seller approval requests by status, shop name, and submission date range.
 *
 * This test validates the admin's ability to filter seller approval requests using
 * multiple criteria including approval status, shop name (partial match), and
 * submission date range. It also verifies pagination functionality.
 */
export async function test_api_seller_approval_request_filter_by_status_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create multiple seller accounts and submit approval requests
  const sellers: Array<{
    connection: api.IConnection;
    request: IShoppingMallSellerApprovalRequest;
  }> = [];
  for (let i = 0; i < 5; i++) {
    const sellerConnection: api.IConnection = { host: connection.host };
    const shopName = `Test Shop ${i}`;
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        shop_name: shopName,
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
    const request =
      await generate_random_shopping_mall_seller_seller_approval_requests_create(
        sellerConnection,
        {
          body: {
            reason: RandomGenerator.paragraph({ sentences: 3 }),
          },
        },
      );
    typia.assert(request);
    sellers.push({ connection: sellerConnection, request });
  }
  // 3. Approve first 3 requests to create varied statuses
  for (let i = 0; i < 3; i++) {
    await api.functional.shoppingMall.admin.seller_approval_requests.update(
      adminConnection,
      {
        requestId: sellers[i].request.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  }
  // 4. Test filtering by status='approved' and shopName containing 'Test'
  const submittedAfter = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const submittedBefore = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const filteredResult =
    await api.functional.shoppingMall.admin.seller_approval_requests.index(
      adminConnection,
      {
        body: {
          status: "approved",
          shopName: "Test",
          submittedAfter,
          submittedBefore,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(filteredResult);
  // 5. Validate filtered results
  TestValidator.equals(
    "all results are approved",
    filteredResult.data.every((req) => req.status === "approved"),
    true,
  );
  TestValidator.equals(
    "all shop names contain 'Test'",
    filteredResult.data.every((req) =>
      req.seller.shop_name.toLowerCase().includes("test"),
    ),
    true,
  );
  TestValidator.equals(
    "filtered count matches approved requests",
    filteredResult.data.length,
    3,
  );
  TestValidator.equals(
    "pagination current page is 1",
    filteredResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    filteredResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "total records matches filtered count",
    filteredResult.pagination.records,
    3,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    filteredResult.pagination.pages === Math.ceil(3 / 10),
  );
  // 6. Test pagination - request page 2 (should be empty)
  const page2Result =
    await api.functional.shoppingMall.admin.seller_approval_requests.index(
      adminConnection,
      {
        body: {
          status: "approved",
          shopName: "Test",
          submittedAfter,
          submittedBefore,
          page: 2,
          limit: 10,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 returns empty array",
    page2Result.data.length,
    0,
  );
  TestValidator.equals(
    "page 2 current page is 2",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 total records still 3",
    page2Result.pagination.records,
    3,
  );
  // 7. Test filtering by status='pending' (should return 2 remaining)
  const pendingResult =
    await api.functional.shoppingMall.admin.seller_approval_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          shopName: "Test",
          submittedAfter,
          submittedBefore,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(pendingResult);
  TestValidator.equals("pending count is 2", pendingResult.data.length, 2);
  TestValidator.equals(
    "all pending results have status pending",
    pendingResult.data.every((req) => req.status === "pending"),
    true,
  );
  TestValidator.equals(
    "pending total records is 2",
    pendingResult.pagination.records,
    2,
  );
}
