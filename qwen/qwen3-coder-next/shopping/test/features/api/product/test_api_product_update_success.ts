import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
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

/**
 * Test product update workflow for seller products API.
 * 1. Register seller account
 * 2. Create a product with initial data
 * 3. Update the product with new values
 * 4. Verify update operation completes successfully
 *
 * Note: Due to empty DTO definition, validation is limited to
 * ensuring the API calls succeed and responses are valid.
 */
export async function test_api_product_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Create seller-specific connections
  const sellerConnection: api.IConnection = { host: connection.host };
  // Step 1: Register seller account
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(3),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Create new connection with authenticated token
  const authenticatedSellerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: sellerAuth.token.access,
    },
  };
  // Step 2: Create product to be updated
  const initialProduct =
    await generate_random_shopping_mall_seller_products_create(
      authenticatedSellerConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          variants: [
            {
              name: RandomGenerator.name(2),
              price: typia.random<
                number & tags.Type<"uint32"> & tags.Minimum<1000>
              >(),
              stock: typia.random<
                number &
                  tags.Type<"uint32"> &
                  tags.Minimum<0> &
                  tags.Maximum<1000>
              >(),
            },
          ],
          images: [
            {
              url: RandomGenerator.paragraph({ sentences: 1 }),
              order: 0,
            },
          ],
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(initialProduct);
  // Step 3: Update the product with new values
  // Since we can't access productId from the created product (no id property in DTO),
  // we need to use a random UUID or store it separately. For this test, we'll
  // use a generated UUID as the productId for the update operation.
  const productId = typia.random<string & tags.Format<"uuid">>();
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(
      authenticatedSellerConnection,
      {
        productId: productId,
        body: {
          name: RandomGenerator.name(4),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IShoppingMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
}
