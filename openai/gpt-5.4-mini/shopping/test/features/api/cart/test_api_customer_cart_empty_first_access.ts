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

export async function test_api_customer_cart_empty_first_access(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joined);
  try {
    const emptyCart = await api.functional.shoppingMall.customer.carts.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallCart.IRequest,
      },
    );
    typia.assert(emptyCart);
    TestValidator.equals(
      "empty cart page current",
      emptyCart.pagination.current,
      1,
    );
    TestValidator.equals(
      "empty cart page limit",
      emptyCart.pagination.limit,
      100,
    );
    TestValidator.equals(
      "empty cart record count",
      emptyCart.pagination.records,
      0,
    );
    TestValidator.equals(
      "empty cart page count",
      emptyCart.pagination.pages,
      0,
    );
    TestValidator.equals("empty cart items", emptyCart.data.length, 0);
  } catch (exp) {
    if (!typia.is<Error>(exp)) throw exp;
    TestValidator.equals("cart not found status", (exp as { status?: number }).status, 404);
  }
}
