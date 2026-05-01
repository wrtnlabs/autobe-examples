import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Verify that deleting a product with a non-existent UUID returns HTTP 404 Not Found.
 *
 * Confirms that the product deletion endpoint correctly rejects requests targeting products that do not exist in the database. An authenticated seller attempts to delete a product using a randomly generated UUID that has never been registered, and the system must respond with a 404 error to indicate the target was not found.
 *
 * 1. Seller registers and authenticates via the join endpoint.
 * 2. Seller attempts to delete a product using a non-existent random UUID.
 * 3. Validates that the API responds with HTTP 404 Not Found.
 */
export async function test_api_product_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Attempt to delete non-existent product
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Expect 404 Not Found
  await TestValidator.httpError(
    "non-existent product deletion returns 404",
    404,
    async () =>
      await api.functional.shoppingMall.seller.products.erase(
        sellerConnection,
        { productId: nonExistentId },
      ),
  );
}
