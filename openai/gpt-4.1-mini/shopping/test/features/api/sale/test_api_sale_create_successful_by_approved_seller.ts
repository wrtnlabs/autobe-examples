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

export async function test_api_sale_create_successful_by_approved_seller(
  connection: api.IConnection,
): Promise<void> {
  // Test creating a new product sale listing by an approved seller. Scenario includes authenticating as a new seller (join), then submitting a valid sale creation request with category_id, name, description, and base_price. Verify the response returns the complete sale entity with initial status 'pending approval'. Validate that seller association is correct and all required fields are stored. Ensure no images, variants are added at this stage. This tests the primary success workflow for sale creation.
  // 1. Seller joins the platform (creates account with pending approval)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
      password: "strongpassword123",
      shopName: RandomGenerator.name(2),
      shopDescription: "Test shop description",
      logoUri: null,
    },
  });
  typia.assert(sellerAuthorized);
  sellerConnection.headers = {
    ...(sellerConnection.headers ?? {}),
    Authorization: sellerAuthorized.token.access,
  };
  // 2. Prepare sale create data
  const saleCreateBody: IShoppingMallSale.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    base_price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
  };
  // 3. Create sale
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {
      body: saleCreateBody,
    },
  );
  typia.assert(sale);
  // 4. Validations
  TestValidator.equals("sale name", sale.name, saleCreateBody.name);
  TestValidator.equals(
    "sale description",
    sale.description,
    saleCreateBody.description,
  );
  TestValidator.equals(
    "sale basePrice",
    sale.basePrice,
    saleCreateBody.base_price,
  );
  TestValidator.equals("sale status", sale.status, "pending approval");
  // seller association
  typia.assert(sale.seller);
  TestValidator.equals("seller id equals", sale.seller.id, sellerAuthorized.id);
  // category id check
  TestValidator.equals(
    "category id",
    sale.category.id,
    saleCreateBody.category_id,
  );
}
