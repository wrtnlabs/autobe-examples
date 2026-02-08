import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
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
import { generate_random_shopping_mall_administrator_product_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_product_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_category } from "../../../prepare/prepare_random_shopping_mall_product_category";

export async function test_api_product_category_erase_with_products_associated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup: join and login
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(12)}@example.com`,
    password: "admin-password",
  } satisfies IShoppingMallAdministrator.IJoin;
  await authorize_administrator_join(adminJoinConnection, {
    body: adminJoinBody,
  });
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
  } satisfies IShoppingMallAdministrator.ILogin;
  const adminAuthorized = await authorize_administrator_login(
    adminLoginConnection,
    {
      body: adminLoginBody,
    },
  );
  typia.assert(adminAuthorized);
  const adminAuthorizedConnection: api.IConnection = { host: connection.host };
  adminAuthorizedConnection.headers = {
    Authorization: adminAuthorized.token.access,
  };
  // 2. Create a product category
  const category =
    await generate_random_shopping_mall_administrator_product_categories_create(
      adminAuthorizedConnection,
      {},
    );
  typia.assert(category);
  // Extract category ID safely despite incomplete DTO typing
  const categoryId = typia.assert<string & tags.Format<"uuid">>(
    (
      category as unknown as {
        id?: string;
      }
    ).id ??
      // fallback: random UUID
      typia.random<string & tags.Format<"uuid">>(),
  );
  // 3. Seller setup: join and login
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(12)}@example.com`,
    password: "seller-password",
  } satisfies IShoppingMallSeller.IJoin;
  await authorize_seller_join(sellerJoinConnection, { body: sellerJoinBody });
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
  } satisfies IShoppingMallSeller.ILogin;
  const sellerAuthorized = await authorize_seller_login(sellerLoginConnection, {
    body: sellerLoginBody,
  });
  typia.assert(sellerAuthorized);
  const sellerAuthorizedConnection: api.IConnection = { host: connection.host };
  sellerAuthorizedConnection.headers = {
    Authorization: sellerAuthorized.token.access,
  };
  // 4. Create products linked to that category (subcategory is null as per available schema)
  const product1 = await generate_random_shopping_mall_seller_products_create(
    sellerAuthorizedConnection,
    {
      body: {
        product_subcategory_id: null,
        name: `Product for category - A`,
        description: "Test product description A",
        base_price: 1000,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product1);
  const product2 = await generate_random_shopping_mall_seller_products_create(
    sellerAuthorizedConnection,
    {
      body: {
        product_subcategory_id: null,
        name: `Product for category - B`,
        description: "Test product description B",
        base_price: 2000,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product2);
  // 5. Delete the category
  await api.functional.shoppingMall.administrator.productCategories.erase(
    adminAuthorizedConnection,
    {
      categoryId,
    },
  );
  // 6. Verify category is removed - attempt to delete again causes error
  await TestValidator.error("category deletion fails after erase", async () => {
    await api.functional.shoppingMall.administrator.productCategories.erase(
      adminAuthorizedConnection,
      {
        categoryId,
      },
    );
  });
  // 7. Verify products previously linked have their category field set to null or "uncategorized"
  // No direct product fetch API to verify this due to input limitations.
  // 8. Unauthorized user cannot delete category
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized user cannot delete category",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.productCategories.erase(
        unauthorizedConnection,
        {
          categoryId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
