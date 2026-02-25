import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_cancellation_requests_empty_dashboard(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerConnection, {});
  typia.assert(authorizedSeller);
  // 2. Test with default pagination parameters
  const defaultRequest: IEcommerceCancellationRequest.IRequest = {};
  const defaultResponse =
    await api.functional.ecommerce.seller.cancellation_requests.pending.index(
      sellerConnection,
      { body: defaultRequest },
    );
  typia.assert(defaultResponse);
  // Validate empty results with proper pagination metadata
  TestValidator.equals("data array empty", defaultResponse.data, []);
  TestValidator.equals("current page 1", defaultResponse.pagination.current, 1);
  TestValidator.equals("limit default", defaultResponse.pagination.limit, 30);
  TestValidator.equals("records zero", defaultResponse.pagination.records, 0);
  TestValidator.equals("pages zero", defaultResponse.pagination.pages, 0);
  // 3. Test with custom limit
  const limitRequest: IEcommerceCancellationRequest.IRequest = {
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  };
  const limitResponse =
    await api.functional.ecommerce.seller.cancellation_requests.pending.index(
      sellerConnection,
      { body: limitRequest },
    );
  typia.assert(limitResponse);
  TestValidator.equals("data empty with limit", limitResponse.data, []);
  TestValidator.equals(
    "current page with limit",
    limitResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit matches request",
    limitResponse.pagination.limit,
    limitRequest.limit,
  );
  TestValidator.equals(
    "records zero with limit",
    limitResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages zero with limit",
    limitResponse.pagination.pages,
    0,
  );
  // 4. Test with page 2 (out of bounds)
  const pageRequest: IEcommerceCancellationRequest.IRequest = {
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<2>>(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  };
  const pageResponse =
    await api.functional.ecommerce.seller.cancellation_requests.pending.index(
      sellerConnection,
      { body: pageRequest },
    );
  typia.assert(pageResponse);
  TestValidator.equals("data empty on page 2", pageResponse.data, []);
  TestValidator.equals(
    "current page matches request",
    pageResponse.pagination.current,
    pageRequest.page,
  );
  TestValidator.equals(
    "limit matches",
    pageResponse.pagination.limit,
    pageRequest.limit,
  );
  TestValidator.equals("records zero", pageResponse.pagination.records, 0);
  TestValidator.equals("pages zero", pageResponse.pagination.pages, 0);
  // 5. Test with search filter (empty result)
  const searchRequest: IEcommerceCancellationRequest.IRequest = {
    search: RandomGenerator.paragraph({ sentences: 1 }),
  };
  const searchResponse =
    await api.functional.ecommerce.seller.cancellation_requests.pending.index(
      sellerConnection,
      { body: searchRequest },
    );
  typia.assert(searchResponse);
  TestValidator.equals("data empty with search", searchResponse.data, []);
  TestValidator.equals(
    "current page 1 with search",
    searchResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "records zero with search",
    searchResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages zero with search",
    searchResponse.pagination.pages,
    0,
  );
}
