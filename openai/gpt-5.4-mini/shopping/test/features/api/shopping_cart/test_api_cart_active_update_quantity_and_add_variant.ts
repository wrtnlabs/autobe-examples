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

export async function test_api_cart_active_update_quantity_and_add_variant(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const request: IMallPlatformShoppingCart.IRequest = {
    page: 1,
    limit: 10,
    items: [],
  };
  const first = await api.functional.mallPlatform.customer.carts.active.index(
    customerConnection,
    {
      body: request,
    },
  );
  typia.assert(first);
  TestValidator.equals(
    "cart pagination current page should be the requested page",
    first.pagination.current,
    1,
  );
  TestValidator.equals(
    "cart pagination limit should be the requested limit",
    first.pagination.limit,
    10,
  );
  const second = await api.functional.mallPlatform.customer.carts.active.index(
    customerConnection,
    {
      body: request,
    },
  );
  typia.assert(second);
  TestValidator.equals(
    "cart response should persist across repeated updates with the same request",
    second.pagination,
    first.pagination,
  );
  TestValidator.equals(
    "cart content should remain stable across repeated updates with the same request",
    second.data,
    first.data,
  );
}
