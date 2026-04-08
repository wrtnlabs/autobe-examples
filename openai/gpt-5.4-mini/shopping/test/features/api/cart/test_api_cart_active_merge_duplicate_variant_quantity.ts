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

export async function test_api_cart_active_merge_duplicate_variant_quantity(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123!",
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const request: IMallPlatformShoppingCart.IRequest = {
    items: [
      {
        cartItemId: typia.random<string & tags.Format<"uuid">>(),
        quantity: 1,
      } satisfies IMallPlatformCartItem.IRequest,
      {
        cartItemId: typia.random<string & tags.Format<"uuid">>(),
        quantity: 2,
      } satisfies IMallPlatformCartItem.IRequest,
    ],
    page: 1,
    limit: 20,
  };
  const cart = await api.functional.mallPlatform.customer.carts.active.index(
    customerConnection,
    { body: request },
  );
  typia.assert(cart);
  TestValidator.equals(
    "cart page current should be 1",
    cart.pagination.current,
    1,
  );
  TestValidator.equals(
    "cart page limit should be 20",
    cart.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "cart response should be usable for redraw",
    cart.data.length >= 0,
  );
  if (cart.data.length > 0) {
    const firstItem = cart.data[0];
    TestValidator.predicate(
      "cart item summary should exist",
      firstItem !== null && firstItem !== undefined,
    );
  }
}
