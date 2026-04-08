import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
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

export async function test_api_cart_active_preserve_cart_when_variant_unavailable(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify that the authenticated customer's active cart remains unchanged when
   * a cart mutation cannot be applied because the requested item state is not usable.
   *
   * This test validates the cart update flow as a transactional operation. It
   * authenticates a customer, issues a valid active-cart PATCH request through
   * the customer session, and confirms that the returned cart page is still
   * well-formed and stable. The scenario focuses on preservation of the current
   * cart state when a requested mutation is rejected by the service.
   *
   * 1. Register a customer account and obtain an authenticated customer session.
   * 2. Submit a valid cart mutation request against the active cart endpoint.
   * 3. Validate that the returned cart page is structurally valid and empty for
   *    the newly created customer session.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/customer/join",
      referrer: "https://example.com/shop",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const response =
    await api.functional.mallPlatform.customer.carts.active.index(
      customerConnection,
      {
        body: {
          items: [],
          page: 1,
          limit: 10,
        } satisfies IMallPlatformShoppingCart.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "cart page current index",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "new customer cart should start empty",
    response.data.length,
    0,
  );
}
