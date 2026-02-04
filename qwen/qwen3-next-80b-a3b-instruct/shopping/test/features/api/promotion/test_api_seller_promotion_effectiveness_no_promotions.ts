import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSalePromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSalePromotion";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSalePromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalePromotion";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_seller_promotion_effectiveness_no_promotions(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller connection and authenticate with proper password constraints
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<
          string & tags.MinLength<12>
        >() satisfies string as string, // Ensures at least 12 characters
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(sellerAuth);
  // Step 2: Use the authenticated seller connection to call the promotions effectiveness endpoint
  // The endpoint should return an empty data array with 200 status when no promotions exist
  const result: IPageIShoppingMallSalePromotion =
    await api.functional.shoppingMall.seller.analytics.promotions.effectiveness.index(
      sellerConnection,
    );
  // Step 3: Validate the response structure
  typia.assert(result);
  // Step 4: Validate the data array is empty
  TestValidator.equals(
    "promotion data array should be empty",
    result.data.length,
    0,
  );
  // Step 5: Validate pagination properties are correctly set for empty results
  TestValidator.equals(
    "pagination current should be 1",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    result.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination records should be 0",
    result.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    result.pagination.pages,
    0,
  );
}
