import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_sale_at_not_found_for_nonexistent_saleid(
  connection: api.IConnection,
): Promise<void> {
  // Test the scenario where the requested saleId does not exist or has been soft deleted.
  // Confirm the API returns a 404 Not Found response.
  // Verify the error handling and error message are appropriate and informative.
  // Ensure that the request is made by an authenticated seller.
  // This validates proper handling of missing resources.
  // Authenticate as a seller to obtain authorized connection
  const sellerConnection: api.IConnection = { host: connection.host };
  // Using authorize_seller_join utility to register and get authorization token
  await authorize_seller_join(sellerConnection, { body: {} });
  // Use a saleId that does not exist (generate random UUID)
  const nonexistentSaleId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to get sale record by nonexistent saleId and expect 404 error
  await TestValidator.httpError(
    "sale at not found for nonexistent saleId",
    404,
    async () => {
      await api.functional.shoppingMall.seller.sales.at(sellerConnection, {
        saleId: nonexistentSaleId,
      });
    },
  );
}
