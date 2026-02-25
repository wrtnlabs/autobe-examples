import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_creation_by_approved_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account with captured password
  const generatedPassword = RandomGenerator.alphaNumeric(16);
  const generatedEmail = typia.random<string & tags.Format<"email">>();
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = typia.assert<IShoppingMallSeller.IAuthorized>(
    await authorize_seller_join(joinConnection, {
      body: {
        email: generatedEmail,
        password: generatedPassword,
      } satisfies IShoppingMallSeller.IJoin,
    }),
  );
  // 2. Log in as the seller using the original email and password (assumed approved in test env)
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_seller_login(loginConnection, {
    body: {
      email: generatedEmail, // Use the stored email from join request, not from joinResult
      password: generatedPassword,
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(loginResult);
  // 3. Create a product with variant using a valid category_id
  // Assume test database has a default category ID (00000000-0000-0000-0000-000000000000)
  const productConnection: api.IConnection = { host: connection.host };
  const product = await generate_random_shopping_mall_seller_products_create(
    productConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: "00000000-0000-0000-0000-000000000000" as string &
          tags.Format<"uuid">,
        base_price: typia.random<number & tags.Minimum<0.01>>(),
        variants: [
          {
            sku_code: RandomGenerator.alphaNumeric(8),
            price: typia.random<number & tags.Minimum<0>>(),
            options: [
              {
                option_name: "Color",
                option_value: "Red",
              },
              {
                option_name: "Size",
                option_value: "Large",
              },
            ],
          },
        ],
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Validate that product creation returned a customer object with a valid ID
  TestValidator.equals(
    "product created successfully",
    product.id !== null,
    true,
  );
}
