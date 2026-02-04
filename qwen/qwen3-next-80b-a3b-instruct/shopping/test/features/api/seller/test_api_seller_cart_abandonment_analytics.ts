import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_seller_cart_abandonment_analytics(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<12>>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Call the abandonment analytics endpoint
  const abandonmentData: IShoppingMallCartItem =
    await api.functional.shoppingMall.seller.analysis.carts.abandonment.index(
      sellerConnection,
    );
  // Validate response structure and types
  typia.assert(abandonmentData);
  // Validate the required metrics
  TestValidator.predicate(
    "totalAbandonedCarts is non-negative",
    abandonmentData.totalAbandonedCarts >= 0,
  );
  TestValidator.predicate(
    "averageCartValue is non-negative",
    abandonmentData.averageCartValue >= 0,
  );
  TestValidator.predicate(
    "abandonmentRate is between 0 and 1",
    abandonmentData.abandonmentRate >= 0 &&
      abandonmentData.abandonmentRate <= 1,
  );
  TestValidator.predicate(
    "averageTimeToAbandonment is non-negative",
    abandonmentData.averageTimeToAbandonment >= 0,
  );
}
