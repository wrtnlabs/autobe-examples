import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShoppingCart";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_shopping_cart_view_empty(
  connection: api.IConnection,
): Promise<void> {
  // Create customer-specific connection for authentication
  const customerConnection: api.IConnection = { host: connection.host };
  // Register a new customer to get an empty cart
  await authorize_customer_join(customerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  // View empty cart for newly registered customer
  const cart =
    await api.functional.shoppingMall.customer.carts.at(customerConnection);
  typia.assert(cart);
  // Validate empty cart structure
  TestValidator.equals("cart has no items", cart.data.length, 0);
  TestValidator.equals("pagination records is 0", cart.pagination.records, 0);
  TestValidator.equals("pagination pages is 0", cart.pagination.pages, 0);
}
