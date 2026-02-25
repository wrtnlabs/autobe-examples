import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import type { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import type { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_cancellation_requests_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create seller-specific connection with proper authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  // Register a new seller account
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // Verify seller account is created with pending approval status
  TestValidator.equals(
    "seller approval status",
    seller.data.profile.approval_status,
    "pending",
  );
  // Test cancellation request filtering by different statuses
  const statuses: Array<"pending" | "approved" | "rejected"> = [
    "pending",
    "approved",
    "rejected",
  ];
  for (const status of statuses) {
    const statusResult =
      await api.functional.shoppingMall.seller.cancellation_requests.index(
        sellerConnection,
        {
          body: {
            status: status,
            page: 1,
            limit: 10,
          } satisfies IShoppingMallOrderCancellationRequest.IRequest,
        },
      );
    typia.assert(statusResult);
    // Verify the response structure is correct
    TestValidator.equals(
      "response has pagination",
      statusResult.pagination !== undefined,
      true,
    );
    TestValidator.equals(
      "response has data array",
      statusResult.data !== undefined,
      true,
    );
    // Verify all returned requests match the requested status filter
    for (const request of statusResult.data) {
      TestValidator.equals(
        "request status matches filter",
        request.status,
        status,
      );
    }
  }
  // Test approved requests have proper responded_at timestamp
  const approvedResult =
    await api.functional.shoppingMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrderCancellationRequest.IRequest,
      },
    );
  typia.assert(approvedResult);
  // For approved requests, verify rejection_reason is null and responded_at is present
  for (const request of approvedResult.data) {
    TestValidator.equals(
      "approved request rejection_reason is null",
      request.rejection_reason,
      null,
    );
    TestValidator.predicate(
      "approved request has responded_at",
      request.responded_at !== null,
    );
  }
  // Test rejected requests have both rejection_reason and responded_at
  const rejectedResult =
    await api.functional.shoppingMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrderCancellationRequest.IRequest,
      },
    );
  typia.assert(rejectedResult);
  // For rejected requests, verify both rejection_reason and responded_at are present
  for (const request of rejectedResult.data) {
    TestValidator.predicate(
      "rejected request has rejection_reason",
      request.rejection_reason !== null,
    );
    TestValidator.predicate(
      "rejected request has responded_at",
      request.responded_at !== null,
    );
  }
  // Test pagination with filtering
  const paginatedResult =
    await api.functional.shoppingMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 5,
        } satisfies IShoppingMallOrderCancellationRequest.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // Verify pagination constraints are respected
  TestValidator.predicate(
    "pagination limit respected",
    paginatedResult.data.length <= 5,
  );
  TestValidator.predicate(
    "pagination has valid page count",
    paginatedResult.pagination.pages >= 0,
  );
  TestValidator.equals(
    "pagination current page is 1",
    paginatedResult.pagination.current,
    1,
  );
}
