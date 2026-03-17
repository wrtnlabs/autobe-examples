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

export async function test_api_product_deletion_blocked_by_paid_or_shipped_order_item(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IShoppingMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: "https://seller.example.com/join",
        referrer: "https://seller.example.com",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  const createBody = {
    shopping_mall_category_id: null,
    name: `blocked-delete-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.content({ paragraphs: 2 }),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000>
    >() satisfies number as number,
    status: "active",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: createBody,
      },
    );
  typia.assert(product);
  TestValidator.equals("seller owns product", product.seller.id, seller.id);
  TestValidator.equals(
    "product name matches input",
    product.name,
    createBody.name,
  );
  TestValidator.equals(
    "product description matches input",
    product.description,
    createBody.description,
  );
  TestValidator.equals(
    "product base price matches input",
    product.base_price,
    createBody.base_price,
  );
  TestValidator.equals(
    "product status matches input",
    product.status,
    createBody.status,
  );
  TestValidator.equals(
    "product is not deleted before erase",
    product.deleted_at,
    null,
  );
  TestValidator.equals("product category is null", product.category, null);
  await TestValidator.error(
    "product deletion is blocked by business-rule conflict",
    async () => {
      await api.functional.shoppingMall.seller.seller_products.erase(
        sellerConnection,
        {
          productId: product.id,
        },
      );
    },
  );
}
