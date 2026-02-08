import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSaleSpecification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSpecification";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_sale_specification_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Attempt to retrieve a sale specification using a non-existent 'specId' UUID.
  // This test ensures the API correctly handles the error case by returning a 404 Not Found status.
  // The test verifies that the seller is authenticated, the request is made with an invalid or non-existent 'specId',
  // and the system properly rejects the request, providing an appropriate error message and status without exposing any sensitive information.
  // 1. Seller account registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  // Update the sellerConnection with Authorization header
  sellerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Attempt to retrieve sale specification with non-existent UUID specId
  const nonExistentSpecId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "should return 404 Not Found for non-existent sale specification",
    404,
    async () => {
      await api.functional.shoppingMall.seller.sale_specifications.at(
        sellerConnection,
        { specId: nonExistentSpecId },
      );
    },
  );
}
