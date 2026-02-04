import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_product_engagement_analytics_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as seller via join
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallSeller.IJoin,
    });
  // sellerConnection.headers is now updated internally by authorize function
  // Step 2: Use sellerConnection for the analytics API call
  const productEngagement: IPageIShoppingMallProduct =
    await api.functional.shoppingMall.seller.analytics.products.engagement.index(
      sellerConnection,
    );
  typia.assert(productEngagement);
  // Step 3: Validate pagination metadata exists
  TestValidator.predicate(
    "pagination exists",
    productEngagement.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination current is positive",
    productEngagement.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    productEngagement.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    productEngagement.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    productEngagement.pagination.pages >= 0,
  );
  // Step 4: Validate data array exists and is an array
  TestValidator.predicate(
    "data exists and is array",
    Array.isArray(productEngagement.data),
  );
  // Step 5: Validate that there is at least one product when records > 0
  if (productEngagement.pagination.records > 0) {
    TestValidator.predicate(
      "has at least one product",
      productEngagement.data.length > 0,
    );
  } else {
    TestValidator.equals(
      "no products when records is 0",
      productEngagement.data.length,
      0,
    );
  }
}
