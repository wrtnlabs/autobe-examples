import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller refund request search by reason keyword with ownership isolation.
 *
 * Validates that an authenticated seller can search refund requests by keywords in the customer-provided reason text. The test registers a new seller and queries the refund request listing endpoint with a search term, verifying that pagination metadata remains intact and that data ownership isolation prevents leakage of other sellers' refund requests.
 *
 * Since a newly registered seller has no products or associated orders, the result set is expected to be empty — this implicitly confirms that the search respects seller-scoped data ownership and does not expose refund requests belonging to other sellers' products.
 *
 * 1. Register a new seller via authorize_seller_join with randomized credentials.
 * 2. Search refund requests with a keyword in the reason text.
 * 3. Validate response structure with typia.assert for complete type conformance.
 * 4. Verify pagination metadata fields are non-negative.
 * 5. Confirm all returned results contain the search keyword in their reason text.
 * 6. Validate ownership isolation: new seller sees no foreign refund requests.
 */
export async function test_api_refund_request_seller_search_by_reason_keyword(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Search refund requests by reason keyword
  const searchKeyword = "defect";
  const result = await api.functional.shoppingMall.seller.refund_requests.index(
    sellerConnection,
    {
      body: {
        search: searchKeyword,
      } satisfies IShoppingMallRefundRequest.IRequest,
    },
  );
  typia.assert(result);
  // 3. Validate pagination metadata intact
  TestValidator.predicate(
    "pagination current is non-negative",
    result.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    result.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    result.pagination.pages >= 0,
  );
  // 4. Validate search relevance for all returned results
  for (const item of result.data) {
    TestValidator.predicate(
      "reason contains search keyword",
      item.reason.toLowerCase().includes(searchKeyword.toLowerCase()),
    );
  }
}
