import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
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

export async function test_api_seller_sales_erase_successful_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Test the primary success scenario where an authorized seller creates a sale listing
  // and then deletes it successfully. Verify the deletion and that subsequent access
  // attempts return 404 Not Found.
  // 1. Authenticate as a new seller
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testpassword",
      shopName: "Test Shop",
      shopDescription: null,
      logoUri: null,
    },
  });
  // Set up a seller-specific connection with the received token
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorizedSeller.token.access },
  };
  // 2. Create a new sale listing by the authenticated seller
  const createdSale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {
      body: {
        // Provide some specific predictable values or let generate_random function handle it
        category_id: typia.random<string & tags.Format<"uuid">>(),
        name: "Test Sale Product",
        description: "Test Description",
        base_price: 1000.0,
      },
    },
  );
  typia.assert(createdSale);
  // 3. Delete the created sale listing
  await api.functional.shoppingMall.seller.sales.erase(sellerConnection, {
    saleId: createdSale.id,
  });
  // 4. Verify that attempting to delete again throws HttpError 404 Not Found
  await TestValidator.httpError("second delete returns 404", 404, async () => {
    await api.functional.shoppingMall.seller.sales.erase(sellerConnection, {
      saleId: createdSale.id,
    });
  });
  // 5. Since there is no public GET endpoint provided for sales, to verify removal attempt
  // will simulate using re-deletion to confirm not found. This complies with scenario plan.
}
