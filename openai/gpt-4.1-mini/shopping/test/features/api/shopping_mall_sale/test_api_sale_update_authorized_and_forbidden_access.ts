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

export async function test_api_sale_update_authorized_and_forbidden_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller 1 joins the platform
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Authorized = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Seller1Pass123!",
      shopName: "Seller1 Shop",
      shopDescription: "Test shop description",
      logoUri: null,
    },
  });
  // After join, authorization token is set internally
  seller1Connection.headers = seller1Connection.headers ?? {};
  seller1Connection.headers.Authorization = seller1Authorized.token.access;
  // 2. Seller 1 creates a sale listing
  const saleCreate = await generate_random_shopping_mall_seller_sales_create(
    seller1Connection,
    {
      body: {
        name: "Original Product Name",
        description: "Original product description",
        base_price: 1000.0,
      },
    },
  );
  typia.assert(saleCreate);
  // 3. Seller 1 updates the sale with new valid values
  const updateBody: IShoppingMallSale.IUpdate = {
    name: "Updated Product Name",
    description: "Updated product description",
    category_id: saleCreate.category.id,
    base_price: 1200.99,
    status: "approved",
  };
  const saleUpdate = await api.functional.shoppingMall.seller.sales.update(
    seller1Connection,
    {
      saleId: saleCreate.id,
      body: updateBody,
    },
  );
  typia.assert(saleUpdate);
  // Validate that updated fields match the update input
  TestValidator.equals("sale name updated", saleUpdate.name, updateBody.name);
  TestValidator.equals(
    "sale description updated",
    saleUpdate.description,
    updateBody.description,
  );
  TestValidator.equals(
    "sale category updated",
    saleUpdate.category.id,
    updateBody.category_id,
  );
  TestValidator.equals(
    "sale base price updated",
    saleUpdate.basePrice,
    updateBody.base_price,
  );
  TestValidator.equals(
    "sale status updated",
    saleUpdate.status,
    updateBody.status,
  );
  // 4. Seller 2 joins the platform (unauthorized seller)
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Authorized = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Seller2Pass123!",
      shopName: "Seller2 Shop",
      shopDescription: null,
      logoUri: null,
    },
  });
  seller2Connection.headers = seller2Connection.headers ?? {};
  seller2Connection.headers.Authorization = seller2Authorized.token.access;
  // 5. Seller 2 attempts to update Seller 1's sale listing - expect 403 Forbidden
  await TestValidator.httpError(
    "forbidden update by non-owner seller",
    403,
    async () => {
      await api.functional.shoppingMall.seller.sales.update(seller2Connection, {
        saleId: saleCreate.id,
        body: {
          name: "Unauthorized Update",
        },
      });
    },
  );
}
