import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleReview";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_reviews_index_filter_rating_range(
  connection: api.IConnection,
): Promise<void> {
  // Test filtering customer product reviews by rating range is not possible because the request DTO is empty.
  // Instead, test customer registration, authorization, and review index retrieval with empty request.
  // 1. Customer registration and authorization
  const customerConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_customer_join(customerConnection, {
    body: {
      email: `${typia.random<string & tags.Format<"email">>()}`,
      password: "P@ssw0rd123",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joinResponse);
  customerConnection.headers = {
    Authorization: joinResponse.token.access,
  };
  // 2. Empty request body
  const requestBody = {} satisfies IShoppingMallSaleReview.IRequest;
  // 3. Retrieve filtered paginated customer reviews (empty filter)
  const reviewPage = await api.functional.shoppingMall.customer.reviews.index(
    customerConnection,
    {
      body: requestBody,
    },
  );
  typia.assert(reviewPage);
  // 4. Validate response structure
  TestValidator.predicate("has data array", Array.isArray(reviewPage.data));
  const pagination = reviewPage.pagination;
  TestValidator.predicate(
    "pagination current page >= 1",
    pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit > 0", pagination.limit > 0);
  TestValidator.predicate(
    "pagination records >= data length",
    pagination.records >= reviewPage.data.length,
  );
  TestValidator.predicate("pagination pages >= 0", pagination.pages >= 0);
}
