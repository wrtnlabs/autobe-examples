import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_product_list_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller account registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      shopName: RandomGenerator.name(),
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(sellerAuth);
  // Setup authenticated connection with seller token
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // 2. Request product list with mandatory pagination parameters only
  const body: IShoppingMallProduct.IRequest = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallProduct.IRequest;
  const response = await api.functional.shoppingMall.seller.products.index(
    sellerConnection,
    { body },
  );
  // Validate response type
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "current page is 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is less or equal than 10",
    response.pagination.limit <= 10 && response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pages and records make sense",
    response.pagination.pages * response.pagination.limit >=
      response.pagination.records,
  );
  // 4. Validate each product summary
  for (const product of response.data) {
    typia.assert(product);
    // All products have non-null id, name, basePrice
    TestValidator.predicate(
      `product ${product.id} has non-empty id, name and positive basePrice`,
      typeof product.id === "string" &&
        product.id.length > 0 &&
        typeof product.name === "string" &&
        product.name.length > 0 &&
        typeof product.basePrice === "number" &&
        product.basePrice >= 0,
    );
    // Ensure seller matches authenticated seller id
    TestValidator.equals("product seller id", product.seller.id, sellerAuth.id);
    // Ensure no deleted products: No deletedAt field or it is null for productSubcategory.category
    if (product.productSubcategory.category.deleted_at !== null) {
      throw new Error(
        `Product category is deleted for product id ${product.id}`,
      );
    }
  }
  // 5. Unauthorized access test: no authentication header returns error
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthorized without token",
    async () =>
      await api.functional.shoppingMall.seller.products.index(
        unauthorizedConnection,
        {
          body,
        },
      ),
  );
}
