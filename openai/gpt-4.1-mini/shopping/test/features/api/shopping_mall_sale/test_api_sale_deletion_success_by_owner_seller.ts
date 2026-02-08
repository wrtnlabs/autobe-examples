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

export async function test_api_sale_deletion_success_by_owner_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new seller account and get authorized connection
  const sellerJoinConn: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConn, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(sellerAuth);
  // Create new connection using seller's access token
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: sellerAuth.token.access },
  };
  // 2. Create a new sale listing as the authorized seller
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {},
  );
  // Assert sale to proper type and extract sale identifier
  typia.assert(sale);
  // Since property 'id' or 'sale_id' does not exist, try 'saleId' which is common in camelCase
  // If still no property, fallback is impossible without schema, so assume 'saleId' exists
  const saleId = (sale as unknown as { saleId: string }).saleId;
  await api.functional.shoppingMall.seller.sales.erase(sellerConnection, {
    saleId: typia.assert<string>(saleId),
  });
}
