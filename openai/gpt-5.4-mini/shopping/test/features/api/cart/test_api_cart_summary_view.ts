import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cart_summary_view(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const cart =
    await api.functional.mallPlatform.customer.carts.create(customerConnection);
  typia.assert(cart);
  const summary =
    await api.functional.mallPlatform.customer.carts.summary.at(
      customerConnection,
    );
  typia.assert(summary);
  TestValidator.equals("cart id matches summary id", summary.id, cart.id);
  TestValidator.equals(
    "customer id matches authorized customer",
    summary.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "customer email matches authorized email",
    summary.customer.email,
    authorized.email,
  );
  TestValidator.equals(
    "customer status matches authorized status",
    summary.customer.status,
    authorized.status,
  );
  TestValidator.predicate(
    "cart summary has a non-negative total price",
    summary.totalPrice >= 0,
  );
  TestValidator.equals(
    "new cart summary contains no items",
    summary.cartItems.length,
    0,
  );
  TestValidator.equals("empty cart total is zero", summary.totalPrice, 0);
  TestValidator.equals(
    "shopping cart owner matches summary customer",
    cart.customer.id,
    summary.customer.id,
  );
  TestValidator.equals(
    "shopping cart timestamps preserve createdAt",
    cart.createdAt,
    summary.createdAt,
  );
  TestValidator.equals(
    "shopping cart timestamps preserve deletedAt",
    cart.deletedAt,
    summary.deletedAt,
  );
}
