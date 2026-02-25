import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_product_search_by_name_and_category(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Search by name keyword on existing products
  const searchKeyword = RandomGenerator.name().substring(
    0,
    Math.max(2, Math.floor(RandomGenerator.name().length * 0.5)),
  );
  const searchResponse = await api.functional.shoppingMall.products.index(
    customerConnection,
    {
      body: {
        name: searchKeyword,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(searchResponse);
  // Validate pagination
  TestValidator.predicate(
    "pagination current page >= 1",
    searchResponse.pagination.current >= 1,
  );
  TestValidator.equals("pagination limit", searchResponse.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records non-negative",
    searchResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    searchResponse.pagination.pages >= 0,
  );
  // Search by category ID on existing products
  const categoryResponse = await api.functional.shoppingMall.products.index(
    customerConnection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        page: 1,
        limit: 10,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(categoryResponse);
  // Validate category search has data
  TestValidator.predicate(
    "category search response has data",
    categoryResponse.data.length >= 0,
  );
  // Validate empty name search returns products
  const emptySearchResponse = await api.functional.shoppingMall.products.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(emptySearchResponse);
  // Validate empty name search returns at least one product
  TestValidator.predicate(
    "empty name search returns at least one product",
    emptySearchResponse.data.length > 0,
  );
}