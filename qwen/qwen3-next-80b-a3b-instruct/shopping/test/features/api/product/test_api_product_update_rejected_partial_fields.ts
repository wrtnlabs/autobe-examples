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

export async function test_api_product_update_rejected_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {},
  });
  // 2. Create a product to update
  const createdProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {},
      },
    );
  typia.assert(createdProduct);
  // Type assertion: We know from API contract and IEntity definition that products have an id even if IShoppingMallProduct is empty
  // Use assertGuard to narrow type to IEntity (which has id)
  typia.assertGuard(createdProduct as IEntity);
  const productId: string = (createdProduct as IEntity).id;
  // 3. Attempt update with partial fields - missing one required field
  // We will test all three cases of missing each required field
  // Case 1: Missing name
  const partialUpdateNoName: IShoppingMallProduct.IUpdate = {
    description: RandomGenerator.paragraph({ sentences: 5 }),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<100>
    >(),
  };
  await TestValidator.error(
    "update rejected when name is missing",
    async () => {
      await api.functional.shoppingMall.seller.products.update(
        sellerConnection,
        {
          productId,
          body: partialUpdateNoName,
        },
      );
    },
  );
  // Case 2: Missing description
  const partialUpdateNoDescription: IShoppingMallProduct.IUpdate = {
    name: RandomGenerator.name(),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<100>
    >(),
  };
  await TestValidator.error(
    "update rejected when description is missing",
    async () => {
      await api.functional.shoppingMall.seller.products.update(
        sellerConnection,
        {
          productId,
          body: partialUpdateNoDescription,
        },
      );
    },
  );
  // Case 3: Missing base_price
  const partialUpdateNoPrice: IShoppingMallProduct.IUpdate = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  };
  await TestValidator.error(
    "update rejected when base_price is missing",
    async () => {
      await api.functional.shoppingMall.seller.products.update(
        sellerConnection,
        {
          productId,
          body: partialUpdateNoPrice,
        },
      );
    },
  );
  // Verify that full update works (sanity check)
  const fullUpdateBody: IShoppingMallProduct.IUpdate = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<100>
    >(),
  };
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId,
      body: fullUpdateBody,
    });
  typia.assert(updatedProduct);
}
