import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_reviews_full_text_search_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Customer registration using utility function
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // Perform search using the API endpoint - IRequest is empty so we use empty body
  const searchResult = await api.functional.shoppingMall.customer.reviews.index(
    customerConnection,
    {
      body: {} satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(searchResult);
  // Validate pagination metadata
  TestValidator.predicate(
    "total records is non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    searchResult.pagination.pages >= 0,
  );
  // Validate data structure: must be array and non-empty
  TestValidator.predicate(
    "data array exists and has items",
    () => Array.isArray(searchResult.data) && searchResult.data.length > 0,
  );
  // Validate data item type - we can only check that it's an object since ISummary is empty
  TestValidator.predicate("data items are objects", () =>
    searchResult.data.every(
      (item) => item !== null && typeof item === "object",
    ),
  );
}
