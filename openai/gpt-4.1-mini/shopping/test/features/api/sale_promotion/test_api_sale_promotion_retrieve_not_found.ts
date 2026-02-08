import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSalePromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalePromotion";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test retrieving sale promotion details for a non-existent promotionId by an authenticated seller.
 * This scenario verifies the system gracefully handles attempts to fetch promotion data with an invalid or non-existent UUID.
 * The seller must be authenticated using the join API prior to this operation.
 * The expected result is a 404 Not Found error or equivalent business error indicating the promotion does not exist.
 */
export async function test_api_sale_promotion_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(authorized);
  // Update connection headers with seller token
  sellerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Attempt to retrieve a sale promotion with a random non-existent UUID
  const fakePromotionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Expect an HttpError with 404 Not Found
  await TestValidator.httpError(
    "retrieving non-existent sale promotion should fail with 404",
    404,
    async () => {
      await api.functional.shoppingMall.seller.sale_promotions.at(
        sellerConnection,
        {
          promotionId: fakePromotionId,
        },
      );
    },
  );
}
