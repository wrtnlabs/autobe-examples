import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function test_api_seller_cancellation_requests_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller-specific connection and authenticate a new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://test.example.com/seller/join",
      referrer: "https://test.example.com/",
      ip: null,
    },
  });
  typia.assert(seller);
  // 2. Test 1: Query with future creation date filter (no possible matches)
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 10);
  const response1 =
    await api.functional.ecommerceMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          createdAtFrom: futureDate.toISOString(),
          limit: 10,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(response1);
  // 3. Validate empty result structure
  TestValidator.equals("data array is empty", response1.data.length, 0);
  TestValidator.equals(
    "pagination records is 0",
    response1.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages is 0", response1.pagination.pages, 0);
  TestValidator.equals(
    "pagination current is 1",
    response1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    response1.pagination.limit,
    10,
  );
  // 4. Test 2: Query with filters that won't match (past response window with status filters)
  const pastDate = new Date("2020-01-01T00:00:00Z");
  const response2 =
    await api.functional.ecommerceMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
          respondedAtFrom: pastDate.toISOString(),
          respondedAtTo: pastDate.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(response2);
  // 5. Validate empty result structure again
  TestValidator.equals(
    "data array is empty for filter set 2",
    response2.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is 0 for filter set 2",
    response2.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0 for filter set 2",
    response2.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current is 1 for filter set 2",
    response2.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20 for filter set 2",
    response2.pagination.limit,
    20,
  );
  // 6. Test 3: Default query without filters for a brand new seller (should also be empty)
  const response3 =
    await api.functional.ecommerceMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {} satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(response3);
  TestValidator.equals(
    "data array is empty for default query",
    response3.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is 0 for default query",
    response3.pagination.records,
    0,
  );
}
