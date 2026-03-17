import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_product_update_other_seller_denied(
  connection: api.IConnection,
): Promise<void> {
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerA);
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerAConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >() satisfies number as number,
          status: RandomGenerator.pick(["active", "draft"] as const),
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);
  const originalName = product.name;
  const originalDescription = product.description;
  const originalBasePrice = product.base_price;
  const originalStatus = product.status;
  const originalCategory = product.category;
  const originalSellerId = product.seller.id;
  const originalUpdatedAt = product.updated_at;
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerB);
  const updateBody = {
    shopping_mall_category_id: null,
    name: RandomGenerator.name(3),
    description: RandomGenerator.content({ paragraphs: 3 }),
    base_price: typia.random<
      number & tags.Minimum<0> & tags.Type<"uint32">
    >() satisfies number as number,
    status: RandomGenerator.pick(["inactive", "draft", "active"] as const),
  } satisfies IShoppingMallProduct.IUpdate;
  await TestValidator.httpError(
    "other seller cannot update another seller's product",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.seller.seller_products.update(
        sellerBConnection,
        {
          productId: product.id,
          body: updateBody,
        },
      );
    },
  );
  TestValidator.equals(
    "original seller remains owner in existing product snapshot",
    product.seller.id,
    originalSellerId,
  );
  TestValidator.equals(
    "product name remains unchanged",
    product.name,
    originalName,
  );
  TestValidator.equals(
    "product description remains unchanged",
    product.description,
    originalDescription,
  );
  TestValidator.equals(
    "product base price remains unchanged",
    product.base_price,
    originalBasePrice,
  );
  TestValidator.equals(
    "product status remains unchanged",
    product.status,
    originalStatus,
  );
  TestValidator.equals(
    "product category remains unchanged",
    product.category,
    originalCategory,
  );
  TestValidator.equals(
    "product updated_at remains unchanged in original object",
    product.updated_at,
    originalUpdatedAt,
  );
}
