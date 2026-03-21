import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_cancellation_requests_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Test filtering by "pending" status - new seller has no cancellation requests
  const pendingResult =
    await api.functional.ecommerceMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingResult);
  TestValidator.equals(
    "pending data is array",
    Array.isArray(pendingResult.data),
    true,
  );
  TestValidator.equals(
    "pending data length is 0 for new seller",
    pendingResult.data.length,
    0,
  );
  TestValidator.predicate(
    "pending pagination records >= 0",
    pendingResult.pagination.records >= 0,
  );
  // 3. Test filtering by "approved" status - new seller has no cancellation requests
  const approvedResult =
    await api.functional.ecommerceMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          status: "approved",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(approvedResult);
  TestValidator.equals(
    "approved data is array",
    Array.isArray(approvedResult.data),
    true,
  );
  TestValidator.equals(
    "approved data length is 0 for new seller",
    approvedResult.data.length,
    0,
  );
  TestValidator.predicate(
    "approved pagination records >= 0",
    approvedResult.pagination.records >= 0,
  );
  // 4. Test filtering by "rejected" status - new seller has no cancellation requests
  const rejectedResult =
    await api.functional.ecommerceMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          status: "rejected",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(rejectedResult);
  TestValidator.equals(
    "rejected data is array",
    Array.isArray(rejectedResult.data),
    true,
  );
  TestValidator.equals(
    "rejected data length is 0 for new seller",
    rejectedResult.data.length,
    0,
  );
  TestValidator.predicate(
    "rejected pagination records >= 0",
    rejectedResult.pagination.records >= 0,
  );
  // 5. Test without status filter (returns all cancellation requests for seller)
  const allResult =
    await api.functional.ecommerceMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {} satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(allResult);
  TestValidator.equals(
    "all data is array",
    Array.isArray(allResult.data),
    true,
  );
  TestValidator.predicate(
    "all pagination records >= 0",
    allResult.pagination.records >= 0,
  );
}
