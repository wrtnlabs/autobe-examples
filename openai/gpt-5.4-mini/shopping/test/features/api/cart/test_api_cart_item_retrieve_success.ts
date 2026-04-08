import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
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

export async function test_api_cart_item_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!" as string & tags.Format<"password">,
      href: "https://example.com/signup",
      referrer: "https://example.com/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const response = await api.functional.mallPlatform.customer.carts.items.at(
    customerConnection,
    {
      cartId: typia.random<string & tags.Format<"uuid">>(),
      cartItemId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(response);
  TestValidator.predicate("cart item has id", response.id.length > 0);
  TestValidator.predicate(
    "shopping cart has id",
    response.shoppingCart.id.length > 0,
  );
  TestValidator.predicate(
    "product variant has id",
    response.productVariant.id.length > 0,
  );
  TestValidator.predicate("quantity is positive", response.quantity > 0);
  TestValidator.predicate(
    "availability state is provided",
    response.availabilityState.length > 0,
  );
}
