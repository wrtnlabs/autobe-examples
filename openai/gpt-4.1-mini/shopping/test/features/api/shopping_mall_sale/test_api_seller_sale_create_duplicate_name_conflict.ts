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

export async function test_api_seller_sale_create_duplicate_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Attempt creating duplicate sale with the same product name in the same category
  // 1. Seller Join and authorization
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerJoinConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(authorizedSeller);
  // Update connection with valid authorization token
  sellerJoinConnection.headers = {
    Authorization: authorizedSeller.token.access,
  };
  // 2. Create first sale listing with a unique name and valid category
  const firstSale = await generate_random_shopping_mall_seller_sales_create(
    sellerJoinConnection,
    {
      body: {}, // Use default random body
    },
  );
  typia.assert(firstSale);
  // 3. Attempt to create duplicate sale listing with the same body
  await TestValidator.error("duplicate sale creation should fail", async () => {
    await generate_random_shopping_mall_seller_sales_create(
      sellerJoinConnection,
      {
        body: firstSale, // Reuse entire sale object for duplication
      },
    );
  });
}
