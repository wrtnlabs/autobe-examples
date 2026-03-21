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

/**
 * Test that an authenticated seller can retrieve a paginated list of their cancellation requests.
 *
 * This validates the primary success path where a seller, after authenticating via join,
 * can access the cancellation requests endpoint. The test verifies that the response
 * includes pagination metadata (current page, total records, total pages) and the data array
 * containing cancellation request summaries with customer, seller, and orderItem information.
 * Since a newly registered seller has no cancellation requests, the response should return
 * an empty data array with correct pagination showing 0 records.
 */
export async function test_api_cancellation_request_list_by_authenticated_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Retrieve cancellation requests for the authenticated seller
  const response =
    await api.functional.ecommerceMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata structure
  TestValidator.equals("pagination exists", response.pagination !== null, true);
  TestValidator.predicate(
    "current page is valid",
    response.pagination.current >= 0,
  );
  TestValidator.predicate("limit is valid", response.pagination.limit > 0);
  TestValidator.predicate(
    "records count is valid",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    response.pagination.pages >= 0,
  );
  // 4. Validate that a newly registered seller has no cancellation requests
  TestValidator.equals(
    "records should be 0 for new seller",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages should be 0 for new seller",
    response.pagination.pages,
    0,
  );
  TestValidator.equals("data array should be empty", response.data.length, 0);
  // 5. Validate response structure with all required properties
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  TestValidator.predicate(
    "pagination has current",
    "current" in response.pagination,
  );
  TestValidator.predicate(
    "pagination has limit",
    "limit" in response.pagination,
  );
  TestValidator.predicate(
    "pagination has records",
    "records" in response.pagination,
  );
  TestValidator.predicate(
    "pagination has pages",
    "pages" in response.pagination,
  );
}
