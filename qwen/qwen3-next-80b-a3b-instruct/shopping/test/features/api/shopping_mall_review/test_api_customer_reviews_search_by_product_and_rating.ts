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

export async function test_api_customer_reviews_search_by_product_and_rating(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  // Generate random search criteria for reviews
  const searchBody = {
    product_id: typia.random<string & tags.Format<"uuid">>(),
    rating_min: 4,
  } satisfies IShoppingMallReview.IRequest;
  // Search for reviews with product_id and rating_min=4
  const searchResult = await api.functional.shoppingMall.customer.reviews.index(
    customerConnection,
    { body: searchBody },
  );
  // Use typia.assert to properly cast the entire response to the expected type structure
  const validatedResult =
    typia.assert<IPageIShoppingMallReview.ISummary>(searchResult);
  // Validate response structure
  void TestValidator.predicate(
    "pagination exists",
    () => validatedResult.pagination !== undefined,
  );
  void TestValidator.predicate("data array exists", () =>
    Array.isArray(validatedResult.data),
  );
  void TestValidator.predicate("pagination has correct types", () => {
    const p = validatedResult.pagination;
    return (
      typeof p.current === "number" &&
      typeof p.limit === "number" &&
      typeof p.records === "number" &&
      typeof p.pages === "number" &&
      p.current >= 0 &&
      p.limit > 0 &&
      p.records >= 0 &&
      p.pages >= 0
    );
  });
  // Since IShoppingMallReview.ISummary is defined as an empty object {},
  // we can only verify that each item is a non-null object
  void TestValidator.predicate("each review is a non-null object", () => {
    return validatedResult.data.every(
      (review: IShoppingMallReview.ISummary) => {
        return typeof review === "object" && review !== null;
      },
    );
  });
}
