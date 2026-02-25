import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cart_retrieval_in_stock_only(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallCustomer.IJoin;
  const authorizedCustomer = await authorize_customer_join(customerConnection, {
    body: customerCredentials,
  });
  typia.assert(authorizedCustomer);
  // Retrieve cart with in_stock_only=true
  const responseWithFilter =
    await api.functional.shoppingMall.customer.carts.index(customerConnection, {
      body: {
        in_stock_only: true,
      } satisfies IShoppingMallCart.IRequest,
    });
  typia.assert(responseWithFilter);
  // Retrieve cart with in_stock_only=false
  const responseAll = await api.functional.shoppingMall.customer.carts.index(
    customerConnection,
    {
      body: {
        in_stock_only: false,
      } satisfies IShoppingMallCart.IRequest,
    },
  );
  typia.assert(responseAll);
  // Validate structure
  TestValidator.equals(
    "response has pagination",
    responseWithFilter.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "response has data",
    responseWithFilter.data !== undefined,
    true,
  );
  TestValidator.equals(
    "response with filter is array",
    Array.isArray(responseWithFilter.data),
    true,
  );
  TestValidator.equals(
    "response without filter is array",
    Array.isArray(responseAll.data),
    true,
  );
  // Validate that filtered results are a subset of all results
  if (responseWithFilter.data.length > 0) {
    TestValidator.predicate("filtered items appear in full list", () => {
      const filteredIds = new Set(
        responseWithFilter.data.map((item) => item.id),
      );
      const allIds = new Set(responseAll.data.map((item) => item.id));
      for (const id of filteredIds) {
        if (!allIds.has(id)) return false;
      }
      return true;
    });
  }
  // Validate that total records in filtered are less than or equal to total records in all
  TestValidator.predicate(
    "filtered records count <= total records count",
    () => {
      return (
        responseWithFilter.pagination.records <= responseAll.pagination.records
      );
    },
  );
  // Validate pagination consistency
  TestValidator.equals(
    "current page is consistent",
    responseWithFilter.pagination.current,
    responseAll.pagination.current,
  );
  TestValidator.equals(
    "limit is consistent",
    responseWithFilter.pagination.limit,
    responseAll.pagination.limit,
  );
}
