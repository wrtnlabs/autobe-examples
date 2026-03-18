import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCart";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_cart_retrieve_active_cart(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string,
      password: "Password123!" satisfies string,
      href: "http://localhost",
      referrer: "http://localhost",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  const cartResponse = await api.functional.shoppingMall.customer.carts.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallCart.IRequest,
    },
  );
  typia.assert(cartResponse);
  TestValidator.equals(
    "cart response should contain exactly one active cart for the signed-in customer",
    cartResponse.data.length,
    1,
  );
  const cart = cartResponse.data[0];
  TestValidator.equals(
    "cart owner should match the authenticated customer",
    cart.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "cart owner email should match the authenticated customer",
    cart.customer.email,
    authorized.email,
  );
  TestValidator.equals(
    "cart owner status should match the authenticated customer",
    cart.customer.accountStatus,
    authorized.accountStatus,
  );
  TestValidator.equals(
    "cart owner deletedAt should match the authenticated customer",
    cart.customer.deletedAt,
    authorized.deletedAt,
  );
  TestValidator.equals(
    "cart owner createdAt should match the authenticated customer",
    cart.customer.createdAt,
    authorized.createdAt,
  );
  TestValidator.equals(
    "cart owner updatedAt should match the authenticated customer",
    cart.customer.updatedAt,
    authorized.updatedAt,
  );
  TestValidator.equals(
    "pagination current page should be 1",
    cartResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    cartResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    cartResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    cartResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination should be internally consistent",
    Math.ceil(
      cartResponse.pagination.records / cartResponse.pagination.limit,
    ) === cartResponse.pagination.pages,
  );
  TestValidator.predicate(
    "returned carts should all belong to the authenticated customer",
    cartResponse.data.every((item) => item.customer.id === authorized.id),
  );
}
