import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cart_item_quantity_update(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  const updated = await api.functional.shoppingMall.customer.items.update(
    customerConnection,
    {
      cartItemId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        quantity: 2,
      } satisfies IShoppingMallCartItem.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals("updated quantity", updated.quantity, 2);
  TestValidator.predicate("cart item id present", updated.id.length > 0);
  TestValidator.predicate(
    "created timestamp present",
    updated.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated timestamp present",
    updated.updated_at.length > 0,
  );
  TestValidator.predicate(
    "cart reference present",
    updated.cart !== null && updated.cart !== undefined,
  );
  TestValidator.predicate(
    "variant reference present",
    updated.productVariant !== null && updated.productVariant !== undefined,
  );
}
