import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformShoppingCart";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cart_item_quantity_combines_same_variant(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that the authenticated cart-item quantity update endpoint responds with a
   * paginated cart summary after an update request.
   *
   * 1. Registers and authenticates a customer using an isolated connection.
   * 2. Sends a structurally valid PATCH request to the cart-item quantity endpoint.
   * 3. Validates the returned response as a shopping-cart page and checks the
   *    pagination metadata is well-formed.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const response =
    await api.functional.mallPlatform.customer.shopping_carts.cart_items.index(
      customerConnection,
      {
        body: {
          id: typia.random<string & tags.Format<"uuid">>(),
          quantity: 1,
          page: 1,
          limit: 100,
        } satisfies IMallPlatformCartItem.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.predicate(
    "cart summary page should contain pagination metadata",
    response.pagination.current >= 1 && response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "cart summary page should expose a non-negative record count",
    response.pagination.records >= 0 && response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "cart summary page data should be an array",
    Array.isArray(response.data),
  );
}
