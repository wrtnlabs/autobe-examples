import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { prepare_random_shopping_mall_product_category } from "../../../prepare/prepare_random_shopping_mall_product_category";

export async function test_api_seller_category_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register as a new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  // 2. Create a new category with a valid name (3-255 characters)
  const categoryName = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 100,
  });
  const category = await api.functional.shoppingMall.seller.categories.create(
    sellerConnection,
    {
      body: {
        name: categoryName,
      } satisfies IShoppingMallProductCategory.ICreate,
    },
  );
  // 3. Verify the category was created successfully
  typia.assert(category);
  TestValidator.equals(
    "category name matches the created name",
    category.name,
    categoryName,
  );
}
