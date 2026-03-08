import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_product_duplicate_name_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup administrator connection and create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const category =
    await api.functional.shoppingMall.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(category);
  // 2. Setup seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Create first product with unique name
  const productName = "Organic Green Tea";
  const firstProduct = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: productName,
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: category.id,
        basePrice: 25.99,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(firstProduct);
  // 4. Attempt to create second product with same name - should fail with 409 Conflict
  await TestValidator.httpError(
    "duplicate product name should be rejected with 409 Conflict",
    409,
    async () => {
      await api.functional.shoppingMall.seller.products.create(
        sellerConnection,
        {
          body: {
            name: productName,
            description: RandomGenerator.paragraph({ sentences: 3 }),
            categoryId: category.id,
            basePrice: 12.99,
          } satisfies IShoppingMallProduct.ICreate,
        },
      );
    },
  );
  // 5. Verify that different seller CAN create product with same name (uniqueness per seller)
  const anotherSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(anotherSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const anotherProduct =
    await api.functional.shoppingMall.seller.products.create(
      anotherSellerConnection,
      {
        body: {
          name: productName,
          description: RandomGenerator.paragraph({ sentences: 4 }),
          categoryId: category.id,
          basePrice: 15.99,
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(anotherProduct);
  // 6. Validate product name uniqueness per seller
  TestValidator.equals(
    "different seller can have same product name",
    anotherProduct.name,
    productName,
  );
}
