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

export async function test_api_cart_item_quantity_update_stock_limit(
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
  const cartItem =
    await api.functional.mallPlatform.customer.carts.items.putByCartitemid(
      customerConnection,
      {
        cartItemId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          quantity: 1,
        } satisfies IMallPlatformCartItem.IUpdate,
      },
    );
  typia.assert(cartItem);
  const originalSnapshot = {
    quantity: cartItem.quantity,
    availabilityState: cartItem.availabilityState,
    cartId: cartItem.shoppingCart.id,
    variantId: cartItem.productVariant.id,
  };
  const updated =
    await api.functional.mallPlatform.customer.carts.items.putByCartitemid(
      customerConnection,
      {
        cartItemId: cartItem.id,
        body: {
          quantity: 1,
        } satisfies IMallPlatformCartItem.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "cart item quantity should remain stable for the same valid quantity",
    updated.quantity,
    originalSnapshot.quantity,
  );
  TestValidator.equals(
    "cart item availability state should remain stable for the same valid quantity",
    updated.availabilityState,
    originalSnapshot.availabilityState,
  );
  TestValidator.equals(
    "cart item should remain in the same cart",
    updated.shoppingCart.id,
    originalSnapshot.cartId,
  );
  TestValidator.equals(
    "cart item should remain associated with the same variant",
    updated.productVariant.id,
    originalSnapshot.variantId,
  );
}
