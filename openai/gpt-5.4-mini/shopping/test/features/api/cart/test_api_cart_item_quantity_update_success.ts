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

export async function test_api_cart_item_quantity_update_success(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  customerConnection.headers = {
    ...(customerConnection.headers ?? {}),
    Authorization: authorized.token.access,
  };
  const cartItemId = typia.random<string & tags.Format<"uuid">>();
  const quantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const output =
    await api.functional.mallPlatform.customer.carts.items.putByCartitemid(
      customerConnection,
      {
        cartItemId,
        body: {
          quantity,
        } satisfies IMallPlatformCartItem.IUpdate,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "cart item id should be preserved",
    output.id,
    cartItemId,
  );
  TestValidator.equals(
    "quantity should match the requested value",
    output.quantity,
    quantity,
  );
  TestValidator.predicate(
    "shopping cart reference should exist",
    output.shoppingCart.id.length > 0,
  );
  TestValidator.predicate(
    "product variant reference should exist",
    output.productVariant.id.length > 0,
  );
}
