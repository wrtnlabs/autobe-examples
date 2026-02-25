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

export async function test_api_sale_create_rejected_for_unapproved_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new seller account with pending approval using utility authorize_seller_join
  const initialSellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(initialSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      shopName: `Test Shop ${RandomGenerator.alphabets(5)}`,
      shopDescription: "Test seller creating sale before approval",
      logoUri: null,
    },
  });
  // Validate sellerAuth structure
  typia.assert(sellerAuth);
  // 2. The seller should be in pending approval status
  TestValidator.equals(
    "seller approval status",
    sellerAuth.approvalStatus,
    "pending",
  );
  // 3. Create a seller-specific connection with bearer token
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // 4. Prepare a sale creation body with random valid data but no category info
  //    We must supply a valid category_id, so create a dummy or fetch a valid one
  //    Since no category creation API is given, generate random UUID as category_id
  //    (Assuming this will cause error if we set unapproved seller)
  const saleCreateBody: IShoppingMallSale.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    name: `Unauthorized Sale ${RandomGenerator.alphabets(5)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100000>
    >(),
  };
  // 5. Attempt to create the sale and expect an error
  await TestValidator.error(
    "create sale rejected for unapproved seller",
    async () => {
      await generate_random_shopping_mall_seller_sales_create(
        sellerConnection,
        {
          body: saleCreateBody,
        },
      );
    },
  );
}
