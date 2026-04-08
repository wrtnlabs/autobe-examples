import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_refund_request_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller - utility function handles data generation
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Search with date range in the future - should return empty
  const farFutureFrom = "2099-01-01T00:00:00.000Z";
  const farFutureTo = "2099-12-31T23:59:59.999Z";
  const futureDateResult =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          requestedAtFrom: farFutureFrom,
          requestedAtTo: farFutureTo,
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(futureDateResult);
  // 3. Validate empty pagination structure for future date search
  TestValidator.equals(
    "future date - data is empty array",
    futureDateResult.data,
    [],
  );
  TestValidator.equals(
    "future date - records is 0",
    futureDateResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "future date - pages is 0",
    futureDateResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "future date - current page is 1",
    futureDateResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "future date - limit is 20",
    futureDateResult.pagination.limit,
    20,
  );
  // 4. Search with non-existent orderItemId - should return empty
  const nonExistentOrderItemId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentItemResult =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          orderItemId: nonExistentOrderItemId,
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(nonExistentItemResult);
  // 5. Validate empty pagination structure for non-existent order item
  TestValidator.equals(
    "non-existent item - data is empty array",
    nonExistentItemResult.data,
    [],
  );
  TestValidator.equals(
    "non-existent item - records is 0",
    nonExistentItemResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent item - pages is 0",
    nonExistentItemResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "non-existent item - current page is 1",
    nonExistentItemResult.pagination.current,
    1,
  );
  // 6. Search with status filter combined with future date - restrictive filter combination
  const restrictiveResult =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
          requestedAtFrom: farFutureFrom,
          requestedAtTo: farFutureTo,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(restrictiveResult);
  // 7. Validate restrictive filter returns empty gracefully
  TestValidator.equals(
    "restrictive filter - data is empty array",
    restrictiveResult.data,
    [],
  );
  TestValidator.equals(
    "restrictive filter - records is 0",
    restrictiveResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "restrictive filter - pages is 0",
    restrictiveResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "restrictive filter - current page is 1",
    restrictiveResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "restrictive filter - limit is 10",
    restrictiveResult.pagination.limit,
    10,
  );
  // 8. Test with page > 1 when no records exist - should still return valid structure
  const emptyPageResult =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          requestedAtFrom: farFutureFrom,
          requestedAtTo: farFutureTo,
          page: 5,
          limit: 20,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(emptyPageResult);
  // 9. Validate pagination metadata even on empty higher page
  TestValidator.equals(
    "empty page 5 - data is empty array",
    emptyPageResult.data,
    [],
  );
  TestValidator.equals(
    "empty page 5 - records is 0",
    emptyPageResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty page 5 - pages is 0",
    emptyPageResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty page 5 - current page is 5",
    emptyPageResult.pagination.current,
    5,
  );
}
