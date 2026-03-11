import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_cancellation_request_list_with_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      shopName: RandomGenerator.name(),
    },
  });
  typia.assert(seller);
  // 2. Test status filter: pending
  const pendingResult =
    await api.functional.shoppingMall.seller.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingResult);
  pendingResult.data.forEach((item) => {
    TestValidator.equals("pending status", item.status, "pending");
  });
  // 3. Test status filter: approved
  const approvedResult =
    await api.functional.shoppingMall.seller.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          status: "approved",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(approvedResult);
  approvedResult.data.forEach((item) => {
    TestValidator.equals("approved status", item.status, "approved");
  });
  // 4. Test status filter: rejected
  const rejectedResult =
    await api.functional.shoppingMall.seller.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          status: "rejected",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(rejectedResult);
  rejectedResult.data.forEach((item) => {
    TestValidator.equals("rejected status", item.status, "rejected");
  });
  // 5. Test pagination with limit=5 and page=1
  const paginatedResult =
    await api.functional.shoppingMall.seller.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          limit: 5,
          page: 1,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "at most 5 records",
    paginatedResult.data.length <= 5,
  );
  TestValidator.equals("current page", paginatedResult.pagination.current, 1);
  TestValidator.equals("limit matches", paginatedResult.pagination.limit, 5);
}
