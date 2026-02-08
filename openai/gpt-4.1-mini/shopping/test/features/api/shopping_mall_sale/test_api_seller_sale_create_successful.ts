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
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";

export async function test_api_seller_sale_create_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller and get authorized connection
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerJoinConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  // Update connection with authorization token for seller
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = { Authorization: sellerAuthorized.token.access };
  // 2. Create sale listing with prepared random body for sale create
  //    We call the helper function that prepares the random valid body:
  //    It ensures valid unique name, category_id, description, base price, status optional
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {
      // No overrides, fully random but valid
    },
  );
  typia.assert(sale);
  // 3. Validate response matches schema and expected business rules
  //    Without knowing exact properties exist, just assert type
}
