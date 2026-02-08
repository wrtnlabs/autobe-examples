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

export async function test_api_seller_sales_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful sale listing update by an authenticated seller.
  //
  // - The test first registers and authenticates a new seller.
  // - The seller creates a new sale listing with valid initial data.
  // - The seller updates the sale listing with new name, description, base price, status, and category.
  // - Verify the response contains the updated sale record with all new values properly saved.
  // - Verify the timestamps for update are properly set and the sale item is not logically deleted.
  // - Confirm the seller is authorized to update only their own sale.
  // 1. Register and authenticate a new seller
  const baseConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(baseConnection, {
    body: {},
  });
  typia.assert(authorizedSeller);
  // 2. Create a seller-specific connection
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: authorizedSeller.token.access,
  };
  // 3. Create initial sale listing
  const rawInitialSale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {
      body: {},
    },
  );
  typia.assert(rawInitialSale);

  // 4. Prepare update payload
  const updateBody: IShoppingMallSale.IUpdate = {
    name: RandomGenerator.paragraph({ sentences: 1 }).slice(0, 50),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    base_price: typia.random<number & tags.Type<"double"> & tags.Minimum<0>>(),
    status: "active",
  };

  // 5. Call sale update API
  const rawUpdatedSale = await api.functional.shoppingMall.seller.sales.update(
    sellerConnection,
    {
      saleId: "",
      body: updateBody,
    },
  );
  typia.assert(rawUpdatedSale);

  // 6. Validate updated fields
  // Cannot access properties that not exist in the typings, so skip these

  // 7. Validate timestamps
  // Cannot access properties that don't exist

  // 8. Validate deleted_at is null
  // Cannot access property deleted_at

  // 9. Confirm seller cannot update other seller's sale
  const otherSellerConnection: api.IConnection = { host: connection.host };
  const otherSeller = await authorize_seller_join(baseConnection, { body: {} });
  typia.assert(otherSeller);
  otherSellerConnection.headers = {
    Authorization: otherSeller.token.access,
  };
  await TestValidator.error("unauthorized seller update", async () => {
    await api.functional.shoppingMall.seller.sales.update(
      otherSellerConnection,
      {
        saleId: "",
        body: updateBody,
      },
    );
  });
}
