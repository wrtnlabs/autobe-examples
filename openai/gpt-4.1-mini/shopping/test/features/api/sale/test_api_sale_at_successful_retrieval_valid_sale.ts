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

export async function test_api_sale_at_successful_retrieval_valid_sale(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as seller using join endpoint
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinBody =
    typia.random<IShoppingMallSeller.IJoin>() satisfies IShoppingMallSeller.IJoin;
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: sellerJoinBody,
  });
  typia.assert(authorizedSeller);
  sellerConnection.headers ??= {};
  sellerConnection.headers.Authorization = authorizedSeller.token.access;
  // Step 2: Generate valid saleId (UUID)
  const saleId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Retrieve sale for this saleId as the authenticated seller
  const sale = await api.functional.shoppingMall.seller.sales.at(
    sellerConnection,
    { saleId },
  );
  typia.assert(sale);
}